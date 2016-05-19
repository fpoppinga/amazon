import _ = require('underscore');
import fs = require('fs');
var Iconv = require('iconv').Iconv;

export interface Options {
    columns: string[],
    defaults: { [s: string]: string },
    firstLine: string,
    columnDelim: string,
    lineDelim: string,
    decSep: string,
    inputEncoding: Encoding,
    outputEncoding: Encoding
}

export interface ReadyCallback {
    (): any;
}

export interface CloseCallback {
    (msg: string): any;
}

export enum Encoding { 'UTF-8', 'ISO-8859-1' };
export class CSVExport {

    private options: Options;
    private filePath: string;
    private escReg: RegExp;
    private converter: any;
    private stream: fs.WriteStream;

    constructor(filePath: string, options: Options) {
        this.options = options;
        this.filePath = filePath;
        this.escReg = new RegExp('"', 'g');
        this.converter = new Iconv(Encoding[options.inputEncoding], Encoding[options.outputEncoding]);
    }

    public start(callback: ReadyCallback) {
        // Create WriteStream
        this.stream = fs.createWriteStream(this.filePath);
        var header = '';

        // Insert first line if necessary
        if (!!this.options.firstLine)
            header += this.options.firstLine + this.options.lineDelim;

        // Build column line
        header += this.options.columns.join(this.options.columnDelim) + this.options.lineDelim;

        // Write header to file
        CSVExport.writeToStream(this.converter.convert(header), this.stream, callback);
    }

    public record(data: Object, callback: ReadyCallback) {
        var self = this;
        var outputString = '';

        _.each(this.options.columns, function(elm, index, list) {
            // Take value from input data or default value or empty string (in this order) and escape the result
            var dataValue: string = self.escapeString(_.has(data, elm) ? data[elm] : (_.has(self.options.defaults, elm) ? self.options.defaults[elm] : ''));
            if (_.isNumber(dataValue))
                dataValue = dataValue.toString().replace('.', self.options.decSep);

            // Append column separator, if not in last column
            outputString += (!dataValue ? '' : dataValue) + ((index == list.length - 1) ? '' : self.options.columnDelim);
        });

        outputString += this.options.lineDelim;
        CSVExport.writeToStream(this.converter.convert(outputString), this.stream, callback);
    };

    public close(callback: CloseCallback) {
        var self = this;
        this.stream.end("", function() {
            callback(self.filePath);
        });
    };

    public static writeToStream(data: Buffer, stream: fs.WriteStream, callback: any) {
        var writeReturn = stream.write(data, function() {
            if (false === writeReturn) {
                stream.once('drain', function() {
                    callback();
                });
            } else {
                callback();
            }
        });

    }

    private escapeString(str) {
        if (this.escReg.test(str)) {
            str = '"' + str.replace(this.escReg, '""') + '"';
        }
        return str;
    }
}
