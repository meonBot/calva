const vscode = require('vscode');
const state = require('../state');

const repl = require('nrepl-client');
const message = require('../repl/message');
const {getNamespace, getActualWord} = require('../utilities');

module.exports = class DefinitionProvider {
    constructor() {
        this.state = state;
    }

    provideDefinition(document, position, token) {
        let selected = document.getWordRangeAtPosition(position),
            selectedText = selected !== undefined ? document.getText(new vscode.Range(selected.start, selected.end)) : "",
            text = getActualWord(document, position, selected, selectedText),
            location = null,
            scope = this,
            filetypeIndex = (document.fileName.lastIndexOf('.') + 1),
            filetype = document.fileName.substr(filetypeIndex, document.fileName.length);
        if (this.state.deref().get('connected')) {
            return new Promise((resolve, reject) => {
                let current = scope.state.deref(),
                    connection = current.get("connection"),
                    client = repl.connect(connection).once('connect', () => {
                    let msg = message.info(current.get(filetype),
                                           getNamespace(document.getText()), text);
                    client.send(msg, function (results) {
                        for (var r = 0; r < results.length; r++) {
                            let result = results[r];
                            if (result.hasOwnProperty('file') && result.file.length > 0) {
                                let pos = new vscode.Position(result.line - 1, result.column);
                                location = new vscode.Location(vscode.Uri.parse(result.file), pos);
                            }
                        }
                        if (location !== null) {
                            resolve(location);
                        } else {
                            reject("No definition found");
                        }
                        client.end();
                    });
                });
            });
        } else {
            return new vscode.Hover("Not connected to nREPL..");
        }
    }
};
