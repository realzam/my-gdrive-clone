import { google } from 'googleapis';
import { getOauth2Client } from './credential'
import DB from './db';

let gDrive = google.drive('v3')
const db = new DB();

async function main() {
    const myArgs = process.argv.slice(2);
    const [fromFolder, toFoler] = myArgs;
    if (!fromFolder) {
        console.log('use: index.js fromFolderId (toFolderID)');
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

    await cloneFolder(drivesIDs[0], fromFolder, toFoler)

    console.log('Clonacion finalizada');
    console.log('Adios');
}

const cloneFolder = async (driveID: string, fromIDFolder: string, toIDFolder: string | null, deep = 0) => {
    // Copy files in root
    if (!toIDFolder) {
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
        fields: 'files(id,name,capabilities)',
        orderBy: 'name',
        pageSize: 1000,
        q: `'${fromIDFolder}' in parents and mimeType != 'application/vnd.google-apps.folder'`
    });
    if (filesInFolder.data.files) {
        for (const file of filesInFolder.data.files) {
            if (file.capabilities?.canCopy) {
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
            } else {

                const canCopyFolder = await gDrive.files.get({
                    supportsAllDrives: true,
                    fileId: fromIDFolder
                });
                console.log(`no se puede copiar el archivo ${file.name} del folder ${canCopyFolder.data.name}`);
                db.addCantCopy(file.id!, canCopyFolder.data.name!, file.name!)
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
            if (!db.isFolderAlreadyCopy(subFolder.id!)) {
                let folderIDTo = '';

                const searchFolderWaittingCopy = await gDrive.files.list({
                    driveId: driveID,
                    includeItemsFromAllDrives: true,
                    corpora: 'drive',
                    supportsAllDrives: true,
                    orderBy: 'name',
                    pageSize: 1000,
                    q: `name = '${subFolder.name!.replaceAll('\'','\\\'')}' and '${toIDFolder}' in parents and mimeType = 'application/vnd.google-apps.folder'`
                });

                if (searchFolderWaittingCopy.data.files?.length === 0) {
                    console.log('Creando el folder a clonar');
                    
                    const newSubFolder = await gDrive.files.create({
                        supportsAllDrives: true,
                        requestBody: {
                            name: subFolder.name!,
                            mimeType: 'application/vnd.google-apps.folder',
                            parents: [toIDFolder]
                        }
                    });
                    folderIDTo = newSubFolder.data.id || '';
                }
                else {
                    console.log('El folder ya existe');
                    const filesFolderTemp = searchFolderWaittingCopy.data.files;
                    if (filesFolderTemp) {
                        folderIDTo = filesFolderTemp[0].id || ''
                    }
                }

                if (subFolder.id && folderIDTo != '') {
                    if (deep === 0 || deep === 1) {
                        console.log('\n\n============================\n\n');
                        console.log(subFolder.name || '');
                        console.log('\n\n============================\n\n');
                    }
                    await cloneFolder(driveID, subFolder.id!, folderIDTo, deep + 1)
                    db.addFolder(subFolder.id)
                } else {
                    console.log(subFolder.name!);
                    throw new Error('Error al clonar subfolder')
                }
            } else {
                console.log(`El folder ${subFolder.name} ya esta copiado`);
            }
        }
    }
    db.addFolder(fromIDFolder)
}


main()