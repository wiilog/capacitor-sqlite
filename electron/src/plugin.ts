import { WebPlugin } from '@capacitor/core';
import {
  CapacitorSQLitePlugin,
  capConnectionOptions,
  capEchoOptions,
  capEchoResult,
  capSQLiteChanges,
  capSQLiteExecuteOptions,
  capSQLiteExportOptions,
  capSQLiteImportOptions,
  capSQLiteJson,
  capSQLiteOptions,
  capSQLiteQueryOptions,
  capSQLiteResult,
  capSQLiteRunOptions,
  capSQLiteSetOptions,
  capSQLiteSyncDateOptions,
  capSQLiteUpgradeOptions,
  capSQLiteValues,
  capSQLiteVersionUpgrade,
} from './definitions';
import { Database } from './electron-utils/Database';
import { UtilsFile } from './electron-utils/utilsFile';
//1234567890123456789012345678901234567890123456789012345678901234567890

const { remote } = require('electron');
export class CapacitorSQLiteElectronWeb
  extends WebPlugin
  implements CapacitorSQLitePlugin {
  RemoteRef: any = null;
  private _dbDict: any = {};
  private _uFile: UtilsFile = new UtilsFile();
  private _versionUpgrades: Record<
    string,
    Record<number, capSQLiteVersionUpgrade>
  > = {};

  constructor() {
    super({
      name: 'CapacitorSQLite',
      platforms: ['electron'],
    });
    console.log('CapacitorSQLite Electron');
    this.RemoteRef = remote;
  }
  async createConnection(
    options: capConnectionOptions,
  ): Promise<capSQLiteResult> {
    const keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a database name',
      });
    }
    const dbName: string = options.database!;
    const version: number = options.version ? options.version : 1;
    const encrypted: boolean = options.encrypted ? options.encrypted : false;
    const inMode: string = options.mode ? options.mode : 'no-encryption';
    let upgDict: Record<number, capSQLiteVersionUpgrade> = {};
    const vUpgKeys: string[] = Object.keys(this._versionUpgrades);
    if (vUpgKeys.length !== 0 && vUpgKeys.includes(dbName)) {
      upgDict = this._versionUpgrades[dbName];
    }
    let mDb: Database = new Database(
      dbName + 'SQLite.db',
      encrypted,
      inMode,
      version,
      upgDict,
    );
    this._dbDict[dbName] = mDb;
    return Promise.resolve({ result: true });
  }
  async closeConnection(options: capSQLiteOptions): Promise<capSQLiteResult> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a database name',
      });
    }
    const dbName: string = options.database!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        result: false,
        message:
          'CloseConnection command failed: No ' +
          'available connection for ' +
          dbName,
      });
    }

    const mDB = this._dbDict[dbName];
    if (mDB.isDBOpen()) {
      // close the database
      try {
        await mDB.close();
      } catch (err) {
        return Promise.resolve({
          result: false,
          message:
            'CloseConnection command failed: ' +
            'close ' +
            dbName +
            ' failed ' +
            err.message,
        });
      }
    }
    // remove the connection from dictionary
    delete this._dbDict[dbName];
    return Promise.resolve({ result: true });
  }

  async echo(options: capEchoOptions): Promise<capEchoResult> {
    console.log('ECHO in CapacitorSQLiteElectronWeb ', options);
    console.log(this.RemoteRef);
    const ret: any = {};
    ret.value = options.value;
    return ret;
  }
  async open(options: capSQLiteOptions): Promise<capSQLiteResult> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a database name',
      });
    }
    const dbName: string = options.database!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        result: false,
        message:
          'Open command failed: No available ' + 'connection for ' + dbName,
      });
    }

    const mDB = this._dbDict[dbName];
    try {
      await mDB.open();
      return Promise.resolve({ result: true });
    } catch (err) {
      return Promise.resolve({
        result: false,
        message: `Open: ${err.message}`,
      });
    }
  }
  async close(options: capSQLiteOptions): Promise<capSQLiteResult> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a database name',
      });
    }
    const dbName: string = options.database!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        result: false,
        message:
          'Close command failed: No available ' + 'connection for ' + dbName,
      });
    }

    const mDB = this._dbDict[dbName];
    try {
      await mDB.close();
      return Promise.resolve({ result: true });
    } catch (err) {
      return Promise.resolve({
        result: false,
        message: `Close: ${err.message}`,
      });
    }
  }
  async execute(options: capSQLiteExecuteOptions): Promise<capSQLiteChanges> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        changes: { changes: -1 },
        message: 'Must provide a database name',
      });
    }
    if (!keys.includes('statements') || options.statements!.length === 0) {
      return Promise.resolve({
        changes: { changes: -1 },
        message: 'Must provide raw SQL statements',
      });
    }
    const dbName: string = options.database!;
    const statements: string = options.statements!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        changes: { changes: -1 },
        message:
          'Execute command failed: No available ' + 'connection for ' + dbName,
      });
    }
    const mDB = this._dbDict[dbName];
    try {
      const ret: number = await mDB.executeSQL(statements);
      if (ret < 0) {
        return Promise.resolve({
          changes: { changes: -1 },
          message: 'Execute failed',
        });
      } else {
        return Promise.resolve({ changes: { changes: ret } });
      }
    } catch (err) {
      return Promise.resolve({
        changes: { changes: -1 },
        message: `Execute failed: ${err}`,
      });
    }
  }
  async executeSet(options: capSQLiteSetOptions): Promise<capSQLiteChanges> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        changes: { changes: -1 },
        message: 'Must provide a database name',
      });
    }
    if (!keys.includes('set') || options.set!.length === 0) {
      return Promise.resolve({
        changes: { changes: -1 },
        message: 'Must provide a non-empty set of SQL ' + 'statements',
      });
    }
    const dbName: string = options.database!;
    const setOfStatements: Array<any> = options.set!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        changes: { changes: -1 },
        message:
          'ExecuteSet command failed: No available ' +
          'connection for ' +
          dbName,
      });
    }
    const mDB = this._dbDict[dbName];

    for (let i = 0; i < setOfStatements.length; i++) {
      if (
        !('statement' in setOfStatements[i]) ||
        !('values' in setOfStatements[i])
      ) {
        return Promise.reject({
          changes: { changes: -1 },
          message:
            'ExecuteSet command failed : Must provide a set as ' +
            'Array of {statement,values}',
        });
      }
    }
    try {
      const ret: any = await mDB.execSet(setOfStatements);
      if (ret < 0) {
        return Promise.resolve({
          changes: { changes: -1 },
          message: `ExecuteSet failed`,
        });
      } else {
        return Promise.resolve({ changes: ret });
      }
    } catch (err) {
      return Promise.resolve({
        changes: { changes: -1 },
        message: `ExecuteSet failed: ${err}`,
      });
    }
  }
  async run(options: capSQLiteRunOptions): Promise<capSQLiteChanges> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        changes: { changes: -1, lastId: -1 },
        message: 'Must provide a database name',
      });
    }
    if (!keys.includes('statement') || options.statement!.length === 0) {
      return Promise.resolve({
        changes: { changes: -1, lastId: -1 },
        message: 'Must provide a query statement',
      });
    }
    if (!keys.includes('values')) {
      return Promise.resolve({
        changes: { changes: -1, lastId: -1 },
        message: 'Must provide an Array of values',
      });
    }
    const dbName: string = options.database!;
    const statement: string = options.statement!;
    const values: Array<any> =
      options.values!.length > 0 ? options.values! : [];
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        changes: { changes: -1, lastId: -1 },
        message: 'RUN failed: No available ' + 'connection for ' + dbName,
      });
    }
    const mDB = this._dbDict[dbName];
    try {
      const ret: any = await mDB.runSQL(statement, values);
      return Promise.resolve({ changes: ret });
    } catch (err) {
      return Promise.resolve({
        changes: { changes: -1, lastId: -1 },
        message: `RUN failed: ${err} `,
      });
    }
  }
  async query(options: capSQLiteQueryOptions): Promise<capSQLiteValues> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        values: [],
        message: 'Must provide a database name',
      });
    }
    if (!keys.includes('statement') || options.statement!.length === 0) {
      return Promise.resolve({
        values: [],
        message: 'Must provide a query statement',
      });
    }
    if (!keys.includes('values')) {
      return Promise.resolve({
        values: [],
        message: 'Must provide an Array of strings',
      });
    }
    const dbName: string = options.database!;
    const statement: string = options.statement!;
    const values: Array<string> =
      options.values!.length > 0 ? options.values! : [];
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        changes: { changes: -1 },
        message:
          'Query command failed: No available ' + 'connection for ' + dbName,
      });
    }
    const mDB = this._dbDict[dbName];
    let ret: any[] = [];
    try {
      ret = await mDB.selectSQL(statement, values);
      return Promise.resolve({ values: ret });
    } catch (err) {
      return Promise.resolve({ values: [], message: `Query failed: ${err}` });
    }
  }
  async isDBExists(options: capSQLiteOptions): Promise<capSQLiteResult> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a database name',
      });
    }
    const dbName: string = options.database!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        result: false,
        message:
          'IsDBExists command failed: No available ' +
          'connection for ' +
          dbName,
      });
    }
    const isExists: boolean = this._uFile.isFileExists(dbName + 'SQLite.db');
    return Promise.resolve({
      result: isExists,
    });
  }
  async deleteDatabase(options: capSQLiteOptions): Promise<capSQLiteResult> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a database name',
      });
    }
    const dbName: string = options.database!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        result: false,
        message:
          'DeleteDatabase command failed: No ' +
          'available connection for ' +
          dbName,
      });
    }

    const mDB = this._dbDict[dbName];
    try {
      await mDB.deleteDB(dbName + 'SQLite.db');
      return Promise.resolve({ result: true });
    } catch (err) {
      return Promise.resolve({
        result: false,
        message: `Delete: ${err.message}`,
      });
    }
  }
  async isJsonValid(options: capSQLiteImportOptions): Promise<capSQLiteResult> {
    const msg: string = JSON.stringify(options);
    return Promise.resolve({
      result: false,
      message: `Method not implemented. ${msg}`,
    });
  }
  async importFromJson(
    options: capSQLiteImportOptions,
  ): Promise<capSQLiteChanges> {
    const msg: string = JSON.stringify(options);
    const retRes = { changes: -1 };
    return Promise.reject({
      changes: retRes,
      message: `Method not implemented. ${msg}`,
    });
  }
  async exportToJson(options: capSQLiteExportOptions): Promise<capSQLiteJson> {
    const msg: string = JSON.stringify(options);
    const retRes = {};
    return Promise.reject({
      export: retRes,
      message: `Method not implemented. ${msg}`,
    });
  }
  async createSyncTable(options: capSQLiteOptions): Promise<capSQLiteChanges> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        changes: { changes: -1 },
        message: 'Must provide a database name',
      });
    }
    const dbName: string = options.database!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        changes: { changes: -1 },
        message:
          'CreateSyncTable command failed: No ' +
          'available connection for ' +
          dbName,
      });
    }

    const mDB = this._dbDict[dbName];
    const ret: any = await mDB.createSyncTable();
    if (ret.message == null) {
      return Promise.resolve({ changes: ret.changes });
    } else {
      return Promise.resolve({ changes: ret.changes, message: ret.message });
    }
  }
  async setSyncDate(
    options: capSQLiteSyncDateOptions,
  ): Promise<capSQLiteResult> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a database name',
      });
    }
    if (!keys.includes('syncdate')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a synchronization date',
      });
    }
    const dbName: string = options.database!;
    const syncDate: string = options.syncdate!;
    keys = Object.keys(this._dbDict);
    if (!keys.includes(dbName)) {
      return Promise.resolve({
        result: false,
        message:
          'SetSyncDate command failed: No ' +
          'available connection for ' +
          dbName,
      });
    }

    const mDB = this._dbDict[dbName];
    const ret: any = await mDB.setSyncDate(syncDate);
    return Promise.resolve(ret);
  }
  async addUpgradeStatement(
    options: capSQLiteUpgradeOptions,
  ): Promise<capSQLiteResult> {
    let keys = Object.keys(options);
    if (!keys.includes('database')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide a database name',
      });
    }
    if (!keys.includes('upgrade')) {
      return Promise.resolve({
        result: false,
        message: 'Must provide an upgrade statement',
      });
    }
    const dbName: string = options.database!;
    const upgrade = options.upgrade![0];
    keys = Object.keys(upgrade);
    if (
      !keys.includes('fromVersion') ||
      !keys.includes('toVersion') ||
      !keys.includes('statement')
    ) {
      return Promise.reject({
        result: false,
        message: 'Must provide an upgrade ' + 'capSQLiteVersionUpgrade Object',
      });
    }
    if (typeof upgrade.fromVersion != 'number') {
      return Promise.reject({
        result: false,
        message: 'ugrade.fromVersion must be a number',
      });
    }
    const upgVDict: Record<number, capSQLiteVersionUpgrade> = {};
    upgVDict[upgrade.fromVersion] = upgrade;
    this._versionUpgrades[dbName] = upgVDict;
    return Promise.resolve({ result: true });
  }
}
const CapacitorSQLite = new CapacitorSQLiteElectronWeb();
export { CapacitorSQLite };
import { registerWebPlugin } from '@capacitor/core';
registerWebPlugin(CapacitorSQLite);
