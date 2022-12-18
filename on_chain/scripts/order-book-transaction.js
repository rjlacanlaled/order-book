import * as helios from '@hyperionbt/helios';

const swapRedeemer = { "constructor": 0, "fields": [] };
const cancelRedeemer = { "constructor": 1, "fields": [] };

const adaToWmtDatum = { "list": [{ "bytes": "1394514f26bc9bf88f3733eaf72a5e298d209a21afe8748c2b1298b6" }, { "constructor": 0, "fields": [{ "bytes": "" }, { "bytes": "" }] }, { "constructor": 0, "fields": [{ "bytes": "065270479316f1d92e00f7f9f095ebeaac9d009c878dc35ce36d3404" }, { "bytes": "574d5474" }] }, { "int": 5000 }] }
const wmtToAdaDatum = { "list": [{ "bytes": "1394514f26bc9bf88f3733eaf72a5e298d209a21afe8748c2b1298b6" }, { "constructor": 0, "fields": [{ "bytes": "065270479316f1d92e00f7f9f095ebeaac9d009c878dc35ce36d3404" }, { "bytes": "574d5474" }] }, { "constructor": 0, "fields": [{ "bytes": "" }, { "bytes": "" }] }, { "int": 100000000 }] }

const tx = new helios.Tx();