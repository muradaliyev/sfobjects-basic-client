type SfPrimitiveType = string | number | boolean | bigint;
type ChildTable<O> = { totalSize: number, done: boolean, records: O[] }
type OnlyStrings<S> = S extends string ? S : never;
type GetObjectTypes<OI> = { [K in keyof OI]: OI[K] }[keyof OI];

// selection

type ShortQueryStatement<OO, O extends OO, K> = { from: K, select: PropSelect<OO, O>[] }; // select must point to further generic type, otherwise will give recursive error

type FullQueryStatement<OO, O extends OO, K> = ShortQueryStatement<OO, O, K> & { where?: WhereProps<OO, O>, limit?: number };

type PropSelect<OO, O extends OO> = {
    [K in keyof O]:
    NonNullable<O[K]> extends SfPrimitiveType ? K :
    NonNullable<O[K]> extends ChildTable<OO> ? FullQueryStatement<OO, NonNullable<O[K]>['records'][0], K> :
    NonNullable<O[K]> extends OO ? ShortQueryStatement<OO, NonNullable<O[K]>, K> :
    never
}[keyof O]


//type RootSelect<OI> = { [N in keyof OI]: { from: N, select: PropSelect<GetObjectTypes<OI>, OI[N]>[] } }[keyof OI];

type RootShortQueryStatement<OI, N extends keyof OI, K = N> = ShortQueryStatement<GetObjectTypes<OI>, OI[N], K>;
type RootFullQueryStatement<OI, N extends keyof OI, K = N> = FullQueryStatement<GetObjectTypes<OI>, OI[N], K>;

export type SfRootQuery<OI> = { [N in OnlyStrings<keyof OI>]: RootFullQueryStatement<OI, N> }[OnlyStrings<keyof OI>];// { from: N, select: PropSelect<GetObjectTypes<OI>, OI[N]>[] } }[keyof OI];


// projection

type SelectProjKeys<S, O> = { [K in keyof O]: K extends S ? K : S extends { from: K } ? K : never }[keyof O]

type WrapNull<T> = T extends null ? null : never;

type SfProjection<OO, O extends OO, S> = {
    [K in SelectProjKeys<S, O>]: WrapNull<O[K]> | (
        S extends K ? O[K] : (
            S extends { from: K, select: any[] } ? (
                NonNullable<O[K]> extends OO ? SfProjection<OO, NonNullable<O[K]>, S['select'][0]> : (
                    NonNullable<O[K]> extends ChildTable<OO> ? ChildTable<SfProjection<OO, NonNullable<O[K]>['records'][0], S['select'][0]>> :
                    never
                )
            ) : never
        )
    )
}

export type SfRootQueryProjection<OI, Q extends SfRootQuery<OI>> = SfProjection<GetObjectTypes<OI>, OI[Q['from']], Q['select'][0]>

// Where

const OP_KEY_AND = '__and';
const OP_KEY_OR = '__or';
const OP_KEY_NOT = '__not';

const OP_KEYS_EQ = ['eq', 'equals', '=', '=='] as const;
const OP_KEYS_NE = ['ne', '!=', '<>'] as const;
const OP_KEYS_LT = ['lt', '<', 'less than'] as const;
const OP_KEYS_LTE = ['lte', '<=', 'less than or equal'] as const;
const OP_KEYS_GT = ['gt', '>', 'greater than'] as const;
const OP_KEYS_GTE = ['gte', '>=', 'greater than or equal'] as const;
const OP_KEYS_IN = ['in'] as const;
const OP_KEYS_NIN = ['nin', 'not in'] as const;
const OP_KEYS_LIKE = ['like'] as const;
const OP_KEYS_NLIKE = ['nlike', 'not like'] as const;

const SINGULAR_OP_KEYS = [
    ...OP_KEYS_EQ,
    ...OP_KEYS_NE,
    ...OP_KEYS_LT,
    ...OP_KEYS_GT,
    ...OP_KEYS_LTE,
    ...OP_KEYS_GTE,
    ...OP_KEYS_LIKE,
    ...OP_KEYS_NLIKE
] as const;

const PLURAL_OP_KEYS = [
    ...OP_KEYS_IN,
    ...OP_KEYS_NIN
] as const;

const LOGICAL_OP_KEYS = [
    OP_KEY_AND,
    OP_KEY_OR,
    OP_KEY_NOT
] as const;

type SfSingularOpKeys = typeof SINGULAR_OP_KEYS[number];
type SfPluralOpKeys = typeof PLURAL_OP_KEYS[number];
type SfLogicalOpKeys = typeof LOGICAL_OP_KEYS[number];
type SfValueOpKeys = SfSingularOpKeys | SfPluralOpKeys;

interface SfOpRule {
    ops: readonly SfValueOpKeys[];
    isNot?: boolean;
    isPlural?: boolean;
    soqlOp: string;
}

const OP_RULES: SfOpRule[] = [
    { ops: OP_KEYS_EQ, soqlOp: '=' },
    { ops: OP_KEYS_NE, soqlOp: '!=' },
    { ops: OP_KEYS_LT, soqlOp: '<' },
    { ops: OP_KEYS_LTE, soqlOp: '<=' },
    { ops: OP_KEYS_GT, soqlOp: '>' },
    { ops: OP_KEYS_GTE, soqlOp: '>=' },
    { ops: OP_KEYS_IN, soqlOp: 'in', isPlural: true },
    { ops: OP_KEYS_NIN, soqlOp: 'in', isNot: true, isPlural: true },
    { ops: OP_KEYS_LIKE, soqlOp: 'like' },
    { ops: OP_KEYS_NLIKE, soqlOp: 'like', isNot: true },
]

interface SfWhereOp<OP extends SfValueOpKeys, V> { op: OP; value: V; }

type WherePropKeys<OO, O extends OO> = { [K in keyof O]: NonNullable<O[K]> extends SfPrimitiveType ? K : NonNullable<O[K]> extends OO ? K : never }[keyof O];

type WhereProps<OO, O extends OO> = {
    [K in WherePropKeys<OO, O>]+?: (
        NonNullable<O[K]> extends SfPrimitiveType ? (
            O[K] | O[K][] | { [OPK in SfSingularOpKeys]: SfWhereOp<OPK, O[K]> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfWhereOp<OPK, O[K][]> }[SfPluralOpKeys]
        ) : (
            NonNullable<O[K]> extends OO ? WhereProps<OO, NonNullable<O[K]>> : never
        )
    )
} | { [K in SfLogicalOpKeys]+?: WhereProps<OO, O> } | WhereProps<OO, O>[];



// Basic Client

export type SfObjectConfig = { dateTypes: string[], dateTimeTypes: string[], timeTypes: string[], lookupTypes: Record<string, string>, childTables: Record<string, string> };

export interface ISfConnection {
    query: <R extends {}>(soql: string) => PromiseLike<{ records: R[] }>
}

export function isPlainObject(value: unknown): value is Record<string, any> {
    if (typeof value !== 'object' || value === null) return false

    if (Object.prototype.toString.call(value) !== '[object Object]') return false

    const proto = Object.getPrototypeOf(value);

    if (proto === null) return true

    const Ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
    return (
        typeof Ctor === 'function' &&
        Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value)
    );
}

export class SfBasicParser<OI> {

    constructor(private _cfg: Record<string, SfObjectConfig>) { }

    private _escapeVal(objName: string, k: string, v: any): string {

        const cfg = this._cfg[objName];

        if (cfg) {

            if (typeof v === 'string') {

                if (cfg?.dateTypes.includes(k) || cfg?.dateTimeTypes.includes(k) || cfg?.timeTypes.includes(k)) {
                    return v;
                }

                return `'${v}'`;
            }

            if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'bigint') {
                return String(v);
            }

            if (v === null) {
                return 'null';
            }
        }

        throw `Unupported value type for where statement`;

    }

    private _constructFullQuery(
        objName: string,
        from: string,
        select: (string | {})[],
        where?: string | Record<string, any>,
        limit?: number
    ): string {

        return [
            'select',
            this._constructSelectStatement(objName, select),
            'from',
            from,
            where && `where ${this._constructWhereStatement(objName, where)}`,
            limit ? `limit ${limit}` : ''
        ]
            .filter(Boolean)
            .join(' ');
    }

    private _constructSelectStatement(
        objName: string,
        select: (string | {})[],
        prefixes: string[] = []
    ): string {

        return select
            .map((rst) => {

                if (typeof rst === 'string') {
                    return [...prefixes, rst].join('.')
                }

                if (isPlainObject(rst)) {

                    const { from } = rst;
                    const oCfg = this._cfg[objName];

                    if (oCfg) {

                        if (oCfg.childTables[from]) {
                            const { select, where, limit } = rst
                            return `( ${this._constructFullQuery(oCfg.childTables[from], select, where, limit)} )`;
                        }

                        if (oCfg.lookupTypes[from]) {
                            return this._constructSelectStatement(oCfg.lookupTypes[from], rst['select'], [...prefixes, from])
                        }
                    }
                }
            })

            .filter(Boolean)
            .join(', ');

    }

    private _constructWhereStatement(
        objName: string,
        where: string | Record<string, any>,
        o?: { prefixes?: string[], isLogicalOr?: boolean, isLogicalNot?: boolean }
    ): string | undefined {

        if (typeof where === 'string') {
            return where;
        }

        const { prefixes, isLogicalNot, isLogicalOr } = o || {};

        const whereStatements = Object.keys(where)
            .map((k): (string | undefined) => {

                const v = where[k];

                if (LOGICAL_OP_KEYS.includes(k as any)) {

                    if (isPlainObject(v)) {
                        return this._constructWhereStatement(objName, v, { prefixes, isLogicalOr: (k === OP_KEY_OR), isLogicalNot: (k === OP_KEY_NOT) });
                    }
                }

                else {

                    const oCfg = this._cfg[objName];

                    if (oCfg) {

                        const keyWithPrefix = [...(prefixes || []), k].join('.');

                        if (isPlainObject(v)) {

                            const { op, value, ...objMaps } = v;

                            if (op !== undefined && value !== undefined) {

                                const opRule = OP_RULES.find(r => r.ops.some(rop => (rop === op)));

                                if (opRule) {

                                    const { soqlOp, isNot, isPlural } = opRule;

                                    if ((isPlural ?? false) === Array.isArray(value)) {

                                        return [
                                            isNot ? 'not (' : '',
                                            keyWithPrefix,
                                            soqlOp,
                                            Array.isArray(value) ? `( ${value.map(v => this._escapeVal(objName, k, v)).join(',')} )` : this._escapeVal(objName, k, value),
                                            isNot ? ')' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ');
                                    }
                                }
                            }

                            else if (op === undefined && value === undefined && Object.keys(objMaps).length) {

                                const childObjName = oCfg.lookupTypes[k];

                                if (childObjName) {
                                    return this._constructWhereStatement(childObjName, objMaps, { prefixes: [...(prefixes || []), k] })
                                }
                            }

                        }
                        else if (Array.isArray(v)) {
                            return `${keyWithPrefix} in (${v.map(vj => this._escapeVal(objName, k, vj)).join(', ')})`;
                        }
                        else {
                            return `${keyWithPrefix} = ${this._escapeVal(objName, k, v)}`;
                        }
                    }
                }
            })
            .filter(Boolean);


        if (whereStatements.length) {

            const joinedStatements = whereStatements.length === 1 ? whereStatements[0] : `( ${whereStatements.join(isLogicalOr ? ' ) or ( ' : ' ) and ( ')})`;

            if (isLogicalNot) {
                return whereStatements.length > 1 ? `not (${joinedStatements})` : `not ${joinedStatements}`;
            }

            return joinedStatements;
        }
    }

    soql(q: SfRootQuery<OI>) {
        const { from, select, where, limit } = q
        return this._constructFullQuery(q.from, from, select, where, limit);
    }
}

export class SfBasicClient<OI> extends SfBasicParser<OI> {

    constructor(cfg: Record<string, SfObjectConfig>, private _conn: ISfConnection) {
        super(cfg);
    }

    exec<Q extends SfRootQuery<OI>>(query: Q) {
        return this._conn.query<SfRootQueryProjection<OI, Q>>(this.soql(query));
    }

    query<Q extends SfRootQuery<OI>>(query: Q) {

        return ({
            exec: () => this.exec(query),
            soql: () => this.soql(query)
        })
    }
}