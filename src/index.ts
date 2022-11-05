import { google } from 'googleapis';
import { getOauth2Client } from './credential'
import DB from './db';

let gDrive = google.drive('v3')
const db = new DB();

async function main() {
    const myArgs = process.argv.slice(2);
    const [fromFolder] = myArgs;
    if (!fromFolder) {
        console.log('use: index.js fromFolderId');
        process.exit(1)
    }

    const scopes = [
        'https://www.googleapis.com/auth/drive',
        'profile',
    ];
    const oauth2Client = await getOauth2Client(scopes);
    google.options({ auth: oauth2Client });
    gDrive = google.drive('v3')
    const drivesIDs = ['0AN-9gdb6DX8pUk9PVA', '0ADptXAxVN5G0Uk9PVA'] //Unidad 1, Unidad 2

    await cloneFolder(drivesIDs[0], fromFolder, null)

    console.log('Clonacion finalizada');
    console.log('Adios');
}

const cloneFolder = async (driveID: string, fromIDFolder: string, toIDFolder: string | null, deep = 0) => {
    // Copy files in root
    if (toIDFolder === null) {
        const nameOriginFolder = await gDrive.files.get({
            supportsAllDrives: true,
            fileId: fromIDFolder
        });

        const newFolderDestiny = await gDrive.files.create({
            supportsAllDrives: true,
            requestBody: {
                name: nameOriginFolder.data.name!,
                mimeType: 'application/vnd.google-apps.folder',
                parents: ['1iBCV-igS0mvvcAcRNro1Le3IGxpS0Urb']
            }
        })
        toIDFolder = newFolderDestiny.data.id!
    }
    const filesInFolder = await gDrive.files.list({
        driveId: driveID,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        supportsAllDrives: true,
        orderBy: 'name',
        pageSize: 1000,
        q: `'${fromIDFolder}' in parents and mimeType != 'application/vnd.google-apps.folder'`
    });
    if (filesInFolder.data.files) {
        for (const file of filesInFolder.data.files) {
            if (!db.isFileAlreadyCopy(file.id || '')) {
                console.log('copy', file.name, file.id);
                const copyResponse = await gDrive.files.copy({
                    fileId: file.id!,
                    supportsAllDrives: true,
                    requestBody: {
                        parents: [toIDFolder]
                    }
                });
                if (copyResponse.status >= 200 && copyResponse.status < 300) {
                    console.log('Copy ok');
                    db.addFile(file.id!)
                } else {
                    console.error(copyResponse.data);
                    throw new Error('No se pudo realizar la copia')
                }
            } else {
                console.log(`file ${file.name} is already copy, skip`);
            }

        }
    }

    //Create subFolders
    const subFolders = await gDrive.files.list({
        driveId: driveID,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        supportsAllDrives: true,
        orderBy: 'name',
        pageSize: 1000,
        q: `'${fromIDFolder}' in parents and mimeType = 'application/vnd.google-apps.folder'`
    });
    if (subFolders.data.files) {
        for (const subFolder of subFolders.data.files) {
            const newSubFolder = await gDrive.files.create({
                supportsAllDrives: true,
                requestBody: {
                    name: subFolder.name!,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [toIDFolder]
                }
            });
            if (subFolder.id && newSubFolder.data.id) {
                if (!db.isFolderAlreadyCopy(subFolder.id!)) {
                    if (deep === 0 || deep === 1) {
                        console.log('\n\n============================\n\n');
                        console.log(subFolder.name || '');
                        console.log('\n\n============================\n\n');
                    }
                    await cloneFolder(driveID, subFolder.id!, newSubFolder.data.id!, deep + 1)
                } else {
                    console.log(`El folder ${subFolder.name} ya esta copiado`);
                }

            } else {
                console.log(newSubFolder.data);
                throw new Error('Error al clonar subfolder')
            }
        }
    }

}


main()