export namespace config {
	
	export class HistoryRecord {
	    id: string;
	    connectionName: string;
	    sql: string;
	    timestamp: string;
	    durationMs: number;
	    success: boolean;
	    errorMessage?: string;
	
	    static createFrom(source: any = {}) {
	        return new HistoryRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.connectionName = source["connectionName"];
	        this.sql = source["sql"];
	        this.timestamp = source["timestamp"];
	        this.durationMs = source["durationMs"];
	        this.success = source["success"];
	        this.errorMessage = source["errorMessage"];
	    }
	}
	export class SavedConnection {
	    id: string;
	    name: string;
	    host: string;
	    port: number;
	    user: string;
	    database: string;
	    saveAuth: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SavedConnection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.database = source["database"];
	        this.saveAuth = source["saveAuth"];
	    }
	}
	export class SavedConnectionsResult {
	    connections: SavedConnection[];
	    error?: db.DBError;
	
	    static createFrom(source: any = {}) {
	        return new SavedConnectionsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connections = this.convertValues(source["connections"], SavedConnection);
	        this.error = this.convertValues(source["error"], db.DBError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace db {
	
	export class DBError {
	    severity: string;
	    code: string;
	    message: string;
	    detail: string;
	    hint: string;
	    position: number;
	
	    static createFrom(source: any = {}) {
	        return new DBError(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.severity = source["severity"];
	        this.code = source["code"];
	        this.message = source["message"];
	        this.detail = source["detail"];
	        this.hint = source["hint"];
	        this.position = source["position"];
	    }
	}
	export class ConnectionStatus {
	    connected: boolean;
	    host: string;
	    port: number;
	    user: string;
	    database: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connected = source["connected"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.database = source["database"];
	    }
	}
	export class ConnectResult {
	    status?: ConnectionStatus;
	    error?: DBError;
	
	    static createFrom(source: any = {}) {
	        return new ConnectResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = this.convertValues(source["status"], ConnectionStatus);
	        this.error = this.convertValues(source["error"], DBError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ConnectionParams {
	    host: string;
	    port: number;
	    user: string;
	    database: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionParams(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.database = source["database"];
	        this.password = source["password"];
	    }
	}
	
	
	export class RowCell {
	    value: string;
	    isNull: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RowCell(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.value = source["value"];
	        this.isNull = source["isNull"];
	    }
	}
	export class StatementResult {
	    commandTag: string;
	    columns: string[];
	    columnTypes: string[];
	    rows: RowCell[][];
	    rowCount: number;
	    truncated: boolean;
	    truncatedAt: number;
	    durationMs: number;
	
	    static createFrom(source: any = {}) {
	        return new StatementResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commandTag = source["commandTag"];
	        this.columns = source["columns"];
	        this.columnTypes = source["columnTypes"];
	        this.rows = this.convertValues(source["rows"], RowCell);
	        this.rowCount = source["rowCount"];
	        this.truncated = source["truncated"];
	        this.truncatedAt = source["truncatedAt"];
	        this.durationMs = source["durationMs"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class QueryExecutionResult {
	    results: StatementResult[];
	    error?: DBError;
	    totalDurationMs: number;
	
	    static createFrom(source: any = {}) {
	        return new QueryExecutionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.results = this.convertValues(source["results"], StatementResult);
	        this.error = this.convertValues(source["error"], DBError);
	        this.totalDurationMs = source["totalDurationMs"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class SimpleResult {
	    success: boolean;
	    error?: DBError;
	
	    static createFrom(source: any = {}) {
	        return new SimpleResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.error = this.convertValues(source["error"], DBError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class TestConnectionResult {
	    success: boolean;
	    serverVersion: string;
	    error?: DBError;
	
	    static createFrom(source: any = {}) {
	        return new TestConnectionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.serverVersion = source["serverVersion"];
	        this.error = this.convertValues(source["error"], DBError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class FileResult {
	    path: string;
	    content: string;
	    error?: db.DBError;
	
	    static createFrom(source: any = {}) {
	        return new FileResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.content = source["content"];
	        this.error = this.convertValues(source["error"], db.DBError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FileSaveResult {
	    path: string;
	    success: boolean;
	    error?: db.DBError;
	
	    static createFrom(source: any = {}) {
	        return new FileSaveResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.success = source["success"];
	        this.error = this.convertValues(source["error"], db.DBError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

