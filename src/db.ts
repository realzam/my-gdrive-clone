import fs from "fs";
import path from "path";

interface CantCopyInfo { folder: string, fileName: string, fileID: string }
class DB {
    private files: string[] = [];
    private folder: string[] = [];
    private cantCopy: CantCopyInfo[] = [];
    private dbFilePath = path.resolve(__dirname, '..', 'db.json')

    constructor() {
        this.loadDBFile();
    }

    loadDBFile() {
        if (fs.existsSync(this.dbFilePath)) {
            const content = fs.readFileSync(this.dbFilePath, { encoding: 'utf8' }).trim()
            if (content != '') {
                const fileObj: {
                    files: string[],
                    folder: string[],
                    cant_copy: CantCopyInfo[]
                } = JSON.parse(content)
                this.files = fileObj.files || [];
                this.folder = fileObj.folder || [];
                this.cantCopy = fileObj.cant_copy || [];
            } else {
                this.saveDBFile();
            }
        } else {
            this.saveDBFile()
        }
    }

    saveDBFile() {
        const info = JSON.stringify({
            files: this.files,
            folder: this.folder,
            cant_copy: this.cantCopy
        });
        fs.writeFileSync(this.dbFilePath, info)
    }

    addFile(fileID: string) {
        if (fileID != '' && !this.files.includes(fileID)) {
            this.files.push(fileID)
            this.saveDBFile()
        }
    }

    addCantCopy(fileID: string, folder: string, fileName: string) {
        const fileExist = this.cantCopy.find((obj) => obj.fileID == fileID)
        if (!fileExist) {
            this.cantCopy.push({
                fileID,
                folder,
                fileName
            })
            this.saveDBFile()
        }
    }

    addFolder(folderID: string) {
        if (folderID != '' && !this.folder.includes(folderID)) {
            this.folder.push(folderID)
            this.saveDBFile()
        }
    }

    isFileAlreadyCopy(fileID: string) {
        return this.files.includes(fileID)
    }
    isFolderAlreadyCopy(folderID: string) {
        return this.folder.includes(folderID)
    }
}

export default DB;