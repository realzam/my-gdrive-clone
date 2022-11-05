import fs from "fs";
import path from "path";

class DB {
    private files: string[] = [];
    private folder: string[] = [];
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
                    folder: string[]
                } = JSON.parse(content)
                this.files = fileObj.files;
                this.folder = fileObj.folder;
            } else {
                this.saveDBFile();
            }
        } else {
            this.saveDBFile()
        }
    }

    saveDBFile() {
        const info = JSON.stringify({ files: this.files });
        fs.writeFileSync(this.dbFilePath, info)
    }

    addFile(fileID: string) {
        if (fileID != '' && !this.files.includes(fileID)) {
            this.files.push(fileID)
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