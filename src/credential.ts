import fs from 'fs';
import path from 'path';
import http from 'http';
import url from 'url';
import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common'
import opn from 'open';
import destroyer from 'server-destroy';


interface Credentials {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
}

interface TokenInfo {
    client_id: string;
    client_secret: string,
    token: string,
    refresh_token: string,
    token_uri: string,
    scopes: string[],
    expiry: string,

}

const dirFiles = path.join(__dirname, '..');
const keyPath = path.join(dirFiles, 'credentials.json');
const tokenPath = path.join(dirFiles, 'token.json');

const getOauth2Client = async (scopes: string[]) => {
    console.log('getting Oauth2Client');
    
    if (fs.existsSync(tokenPath)) {
        console.log('Loading from storage token');
        const tokenInfo: TokenInfo = JSON.parse(fs.readFileSync(tokenPath, { encoding: 'utf8' }))
        const oauth2Client = new google.auth.OAuth2(
            tokenInfo.client_id,
            tokenInfo.client_secret,
            'http://localhost:3000'
        );
        oauth2Client.setCredentials(tokenInfo)
        return oauth2Client;
    }
    if (!fs.existsSync(keyPath)) {
        throw Error('credentials file is necesary');
    }

    return await authenticate(scopes);
}

/**
 * Open an http server to accept the oauth callback. In this simple example, the only request to our webserver is to /callback?code=<code>
 */
async function authenticate(scopes: string[]): Promise<OAuth2Client> {
    console.log('Generate a new token from auth');
    const keys: Credentials = JSON.parse(fs.readFileSync(keyPath, { encoding: 'utf8' }))["installed"]
    const oauth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        'http://localhost:3000'
    );

    return new Promise((resolve, reject) => {
        // grab the url that will be used for authorization
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes.join(' '),
        });
        const server = http
            .createServer(async (req, res) => {
                try {
                    if (req.url) {

                        const qs = new url.URL(req.url!, 'http://localhost:3000')
                            .searchParams;

                        if (qs.get('code')) {
                            res.end('Authentication successful! Please return to the console.');
                            server.destroy();
                            console.log('code:', qs.get('code'));
                            const responseTokens = await oauth2Client.getToken(qs.get('code')!);
                            const { tokens } = responseTokens
                            oauth2Client.setCredentials(tokens);
                            fs.writeFileSync(tokenPath, JSON.stringify({
                                "client_id": keys.client_id,
                                "client_secret": keys.client_secret,
                                ...tokens,
                            }))
                            resolve(oauth2Client);
                        }

                    }
                } catch (e) {
                    reject(e);
                }
            })
            .listen(3000, () => {
                opn(authorizeUrl, { wait: false }).then(cp => cp.unref());
            });
        destroyer(server);
    });
}

export { getOauth2Client }