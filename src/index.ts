// utility

type WrapNull<T> = T extends null ? null : never;
type KeyOf<O> = (keyof O) & string;
type SfPrimitiveType = string | number | boolean | bigint;
type ChildTable<O> = { totalSize: number, done: boolean, records: O[] }
type GetObjectTypes<OI> = { [K in KeyOf<OI>]: OI[K] }[KeyOf<OI>];

// selection

type ShortQueryStatement<OO, O extends OO, K> = { from: K, select: PropSelect<OO, O>[] }; // select must point to further generic type, otherwise will give recursive error

type FullQueryStatement<OO, O extends OO, K> = ShortQueryStatement<OO, O, K> & { where?: SfWhereProps<OO, O>, limit?: number, orderBy?: SfOrderBy<OO, O> };

type PropSelect<OO, O extends OO> = {
    [K in KeyOf<O>]:
    NonNullable<O[K]> extends SfPrimitiveType ? K :
    NonNullable<O[K]> extends ChildTable<OO> ? FullQueryStatement<OO, NonNullable<O[K]>['records'][0], K> :
    NonNullable<O[K]> extends OO ? ShortQueryStatement<OO, NonNullable<O[K]>, K> :
    never
}[KeyOf<O>]

export type SfRootSelect<OI, N extends KeyOf<OI>> = PropSelect<GetObjectTypes<OI>, OI[N]>;


type RootShortQueryStatement<OI, N extends KeyOf<OI>, K = N> = ShortQueryStatement<GetObjectTypes<OI>, OI[N], K>;
type RootFullQueryStatement<OI, N extends KeyOf<OI>, K = N> = FullQueryStatement<GetObjectTypes<OI>, OI[N], K>;

export type SfRootQuery<OI> = { [N in KeyOf<OI>]: RootFullQueryStatement<OI, N> }[KeyOf<OI>];


// projection

type SelectProjKeys<S, O> = { [K in KeyOf<O>]: K extends S ? K : S extends { from: K } ? K : never }[KeyOf<O>]

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

export type SfRootQueryProjection<OI, Q extends SfRootQuery<OI>> = SfProjection<GetObjectTypes<OI>, OI[Q['from']], Q['select'][0]>;

export type SfRootSelectProjection<OI, N extends KeyOf<OI>, S extends SfRootSelect<OI, N>> = SfProjection<GetObjectTypes<OI>, OI[N], S>;

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

type ParentOrPrimitiveProps<OO, O extends OO> = { [K in KeyOf<O>]: NonNullable<O[K]> extends SfPrimitiveType ? K : NonNullable<O[K]> extends OO ? K : never }[KeyOf<O>];

type SfWhereProps<OO, O extends OO> = {
    [K in ParentOrPrimitiveProps<OO, O>]+?: (
        NonNullable<O[K]> extends SfPrimitiveType ? (
            O[K] | O[K][] | { [OPK in SfSingularOpKeys]: SfWhereOp<OPK, O[K]> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfWhereOp<OPK, O[K][]> }[SfPluralOpKeys]
        ) : (
            NonNullable<O[K]> extends OO ? SfWhereProps<OO, NonNullable<O[K]>> : never
        )
    )
} | { [K in SfLogicalOpKeys]+?: SfWhereProps<OO, O> } | SfWhereProps<OO, O>[];

export type SfRootWhere<OI, N extends KeyOf<OI>> = SfWhereProps<GetObjectTypes<OI>, OI[N]>;

// order by

type SfOrderType = 'asc' | 'desc';

type SfOrderBy<OO, O extends OO> = {
    [K in ParentOrPrimitiveProps<OO, O>]+?: NonNullable<O[K]> extends SfPrimitiveType ? SfOrderType : (
        NonNullable<O[K]> extends OO ? SfOrderBy<OO, NonNullable<O[K]>> : never
    )
}

export type SfRootOrderBy<OI, N extends KeyOf<OI>> = SfOrderBy<GetObjectTypes<OI>, OI[N]>;


// Create

type CreatePrimitiveProps<O> = {
    [K in KeyOf<O>]: K extends 'Id' ? never : (
        NonNullable<O[K]> extends SfPrimitiveType ? K : never
    )
}[KeyOf<O>];

export type SfRootCreate<O> = { [K in CreatePrimitiveProps<O>]+?: O[K] }

// Upsert

export type SfRootUpsert<O, K extends CreatePrimitiveProps<O>> = SfRootCreate<O> & { [P in K]: O[P] };

// Update

export type SfRootUpdate<O> = { Id: string } & SfRootCreate<O>;


// Basic Client

export type SfObjectConfig = {
    objectPrefix: string,
    dateTypes: string[],
    dateTimeTypes: string[],
    timeTypes: string[],
    lookupTypes: Record<string, string>,
    childTables: Record<string, string>,
    recordTypes: Record<string, string>
};

export type SfObjectsConfigIndex = Record<string, SfObjectConfig>;

export type SfParserQuery<
    OI,
    N extends KeyOf<OI>,
    S extends SfRootSelect<OI, N>,
    W extends SfRootWhere<OI, N> = never,
    R extends SfRootOrderBy<OI, N> = never
> = { from: N, select: S[], where?: W, orderBy?: R, limit?: number };

//upsert<N extends SObjectNames<S>, InputRecord extends SObjectInputRecord<S, N> = SObjectInputRecord<S, N>, FieldNames extends SObjectFieldNames<S, N> = SObjectFieldNames<S, N>>(type: N, records: InputRecord[], extIdField: FieldNames, options?: DmlOptions): Promise<UpsertResult[]>;
//update<N extends SObjectNames<S>, UpdateRecord extends SObjectUpdateRecord<S, N> = SObjectUpdateRecord<S, N>>(type: N, records: UpdateRecord[], options?: DmlOptions): Promise<SaveResult[]>;

export interface ISfConnection {
    query: <R extends {}>(soql: string) => PromiseLike<{ records: R[] }>,
    upsert: <R, O = never>(n: string, r: any[], key: string, o: O) => PromiseLike<R[]>
    update: <R, O = never>(n: string, r: any[], o: O) => PromiseLike<R[]>
    create: <R, O = never>(n: string, r: any[], o: O) => PromiseLike<R[]>
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




export function getClient<OI>(_cfg: SfObjectsConfigIndex, _conn: ISfConnection) {

    function _escapeVal(objName: string, k: string, v: any): string {

        const cfg = _cfg[objName];

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

    function _constructFullQuery(
        objName: string,
        from: string,
        select: (string | {})[],
        where?: string | Record<string, any>,
        orderBy?: {},
        limit?: number
    ): string {

        return [
            'select',
            _constructSelectStatement(objName, select),
            'from',
            from,
            where && `where ${_constructWhereStatement(objName, where)}`,
            limit ? `limit ${limit}` : ''
        ]
            .filter(Boolean)
            .join(' ');
    }

    function _constructSelectStatement(
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

                    const from = rst['from'];
                    const oCfg = _cfg[objName];

                    if (oCfg) {

                        if (oCfg.childTables[from]) {
                            const { select, where, limit } = rst
                            return `( ${_constructFullQuery(oCfg.childTables[from], select, where, limit)} )`;
                        }

                        if (oCfg.lookupTypes[from]) {
                            return _constructSelectStatement(oCfg.lookupTypes[from], rst['select'], [...prefixes, from])
                        }
                    }
                }
            })
            .filter(Boolean)
            .join(', ');

    }

    function _constructWhereStatement(
        objName: string,
        where: string | Record<string, any>,
        o?: { prefixes?: string[], isLogicalOr?: boolean, isLogicalNot?: boolean }
    ): string | undefined {

        if (typeof where === 'string') {
            return where;
        }

        const { prefixes, isLogicalNot, isLogicalOr } = o || {};

        const whereStatements = Object.keys(where)
            .map((propName): (string | undefined) => {

                const v = where[propName];

                if (LOGICAL_OP_KEYS.includes(propName as any)) {

                    if (isPlainObject(v)) {
                        return _constructWhereStatement(objName, v, { prefixes, isLogicalOr: (propName === OP_KEY_OR), isLogicalNot: (propName === OP_KEY_NOT) });
                    }
                }

                else {

                    const oCfg = _cfg[objName];

                    if (oCfg) {

                        const keyWithPrefix = [...(prefixes || []), propName].join('.');

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
                                            Array.isArray(value) ? `( ${value.map(v => _escapeVal(objName, propName, v)).join(',')} )` : _escapeVal(objName, propName, value),
                                            isNot ? ')' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ');
                                    }
                                }
                            }

                            else if (op === undefined && value === undefined && Object.keys(objMaps).length) {

                                const childObjName = oCfg.lookupTypes[propName];

                                if (childObjName) {
                                    return _constructWhereStatement(childObjName, objMaps, { prefixes: [...(prefixes || []), propName] })
                                }
                            }

                        }
                        else if (Array.isArray(v)) {
                            return `${keyWithPrefix} in (${v.map(vj => _escapeVal(objName, propName, vj)).join(', ')})`;
                        }
                        else {
                            return `${keyWithPrefix} = ${_escapeVal(objName, propName, v)}`;
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


    function _query<N extends KeyOf<OI>, S extends SfRootSelect<OI, N>, W extends SfRootWhere<OI, N> = never, R extends SfRootOrderBy<OI, N> = never>(
        from: N,
        select: S[],
        where?: W,
        orderBy?: R,
        limit?: number
    ) {

        const soql = () => _constructFullQuery(from, from, select, where, orderBy, limit)

        return ({
            soql,
            get: async () => await _conn.query<SfRootSelectProjection<OI, N, S>>(soql()), // to get rid of promiselike,            
            limit: (limit: number) => _query(from, select, where, orderBy, limit)
        });
    }


    return ({

        sfQuery: <Q extends SfRootQuery<OI>>(q: Q) => {
            const { from, select, where, orderBy, limit } = q;
            return _query(from, select, where, orderBy, limit);
        },

        sfObject: <N extends KeyOf<OI>>(from: N) => ({

            update: async <O = never>(records: SfRootUpdate<OI[N]>[], options: O) => await _conn.update(from, records, options),

            create: async <O = never>(records: SfRootCreate<OI[N]>[], options: O) => await _conn.create(from, records, options),

            upsert: async <K extends CreatePrimitiveProps<OI[N]>, O = never>(records: SfRootUpsert<OI[N], K>[], key: K, options: O) => await _conn.upsert(from, records, key, options),

            select: <S extends SfRootSelect<OI, N>>(select: S[]) => ({

                ..._query(from, select),

                orderBy: <R extends SfRootOrderBy<OI, N>>(orderBy: R) => _query(from, select, undefined, orderBy),

                where: <W extends SfRootWhere<OI, N>>(where: W) => ({

                    ..._query(from, select, where),

                    orderBy: <R extends SfRootOrderBy<OI, N>>(orderBy: R) => _query(from, select, where, orderBy)
                })

            })
        })
    })
}
