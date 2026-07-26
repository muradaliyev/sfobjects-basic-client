// utility

type WrapNull<T> = T extends null ? null : never;
type KeyOf<O> = (keyof O) & string;
type SfPrimitiveType = string | number | boolean | bigint;
type ChildTable<O> = { totalSize: number, done: boolean, records: O[] }
type GetObjectTypes<OI> = { [K in KeyOf<OI>]: OI[K] }[KeyOf<OI>];

// selection

type ShortQueryStatement<OO, O extends OO, K> = { from: K, select: SfSelect<OO, O>[] }; // select must point to further generic type, otherwise will give recursive error

type FullQueryStatement<OO, O extends OO, K> = ShortQueryStatement<OO, O, K> & { where?: SfWhere<OO, O>, limit?: number, orderBy?: SfOrderBy<OO, O> };

type SfSelect<OO, O extends OO> = {
    [K in KeyOf<O>]:
    NonNullable<O[K]> extends SfPrimitiveType ? K :
    NonNullable<O[K]> extends ChildTable<OO> ? FullQueryStatement<OO, NonNullable<O[K]>['records'][0], K> :
    NonNullable<O[K]> extends OO ? ShortQueryStatement<OO, NonNullable<O[K]>, K> :
    never
}[KeyOf<O>]



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

type SfWhere<OO, O extends OO> = {
    [K in ParentOrPrimitiveProps<OO, O>]+?: (
        NonNullable<O[K]> extends SfPrimitiveType ? (
            O[K] | O[K][] | { [OPK in SfSingularOpKeys]: SfWhereOp<OPK, O[K]> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfWhereOp<OPK, O[K][]> }[SfPluralOpKeys]
        ) : (
            NonNullable<O[K]> extends OO ? SfWhere<OO, NonNullable<O[K]>> : never
        )
    )
} | { [K in SfLogicalOpKeys]+?: SfWhere<OO, O> } | SfWhere<OO, O>[];



// order by

type SfOrderType = 'asc' | 'desc';

type SfOrderBy<OO, O extends OO> = {
    [K in ParentOrPrimitiveProps<OO, O>]+?: NonNullable<O[K]> extends SfPrimitiveType ? SfOrderType : (
        NonNullable<O[K]> extends OO ? SfOrderBy<OO, NonNullable<O[K]>> : never
    )
}


// Create

type CreatePrimitiveProps<O> = {
    [K in KeyOf<O>]: K extends 'Id' ? never : (
        NonNullable<O[K]> extends SfPrimitiveType ? K : never
    )
}[KeyOf<O>];

// Select

export type SfRootSelect<OI, N extends KeyOf<OI>> = SfSelect<GetObjectTypes<OI>, OI[N]>;

//export type SfRootQuery<OI> = { [N in KeyOf<OI>]: FullQueryStatement<GetObjectTypes<OI>, OI[N], N> }[KeyOf<OI>];

export type SfRootWhere<OI, N extends KeyOf<OI>> = SfWhere<GetObjectTypes<OI>, OI[N]>;

export type SfRootOrderBy<OI, N extends KeyOf<OI>> = SfOrderBy<GetObjectTypes<OI>, OI[N]>;


// Projection

//export type SfRootQueryProjection<OI, Q extends SfRootQuery<OI>> = SfProjection<GetObjectTypes<OI>, OI[Q['from']], Q['select'][0]>;

export type SfRootSelectProjection<OI, N extends KeyOf<OI>, S extends SfRootSelect<OI, N>> = SfProjection<GetObjectTypes<OI>, OI[N], S>;

// Create

export type SfCreate<O> = { [K in CreatePrimitiveProps<O>]+?: O[K] }

// Upsert

export type SfUpsert<O, K extends CreatePrimitiveProps<O>> = SfCreate<O> & { [P in K]: O[P] };

// Update

export type SfUpdate<O> = { Id: string } & SfCreate<O>;


// Basic Client

export type SfObjCfg = {
    objectPrefix: string,
    dateTypes: string[],
    dateTimeTypes: string[],
    timeTypes: string[],
    lookupTypes: Record<string, string>,
    childTables: Record<string, string>,
    recordTypes: Record<string, string>
};

export type SfObjCfgIndex<OI> = Record<KeyOf<OI>, SfObjCfg>;



export interface ISfConnection {
    query: <R extends {}>(soql: string) => PromiseLike<{ records: R[] }>,
    upsert: <R, O = never>(n: string, r: any[], key: string, o?: O) => PromiseLike<R[]>
    update: <R, O = never>(n: string, r: any[], o?: O) => PromiseLike<R[]>
    create: <R, O = never>(n: string, r: any[], o?: O) => PromiseLike<R[]>
}

export interface SfSelectActions<OI, N extends KeyOf<OI>, S extends SfRootSelect<OI, N>> {
    soql: () => string;
    get: () => Promise<{ records: SfRootSelectProjection<OI, N, S>[] }>;
    limit: (limit: number) => SfSelectActions<OI, N, S>;
}

export interface SfOrderByAction<OI, N extends KeyOf<OI>, S extends SfRootSelect<OI, N>> {
    orderBy: (orderBy: SfRootOrderBy<OI, N>) => SfSelectActions<OI, N, S>;
}

export interface SfWhereActions<OI, N extends KeyOf<OI>, S extends SfRootSelect<OI, N>> {
    where: (where: SfRootWhere<OI, N>) => (SfSelectActions<OI, N, S> & SfOrderByAction<OI, N, S>);
}

export interface SfObjActions<OI, N extends KeyOf<OI>> {
    query: <S extends SfRootSelect<OI, N>>(q: { select: S[], where?: SfRootWhere<OI, N>, orderBy?: SfRootOrderBy<OI, N>, limit?: number }) => SfSelectActions<OI, N, S>;
    update: <R, O = never>(records: SfUpdate<OI[N]>[], options?: O) => Promise<R[]>;
    create: <R, O = never>(records: SfCreate<OI[N]>[], options?: O) => Promise<R[]>;
    upsert: <R, K extends CreatePrimitiveProps<OI[N]>, O = never>(records: SfUpsert<OI[N], K>[], key: K, options?: O) => Promise<R[]>;
    select: <S extends SfRootSelect<OI, N>>(select: S[]) => (SfSelectActions<OI, N, S> & SfWhereActions<OI, N, S>);
}

export type ISfObjects<OI> = { [N in KeyOf<OI>]: SfObjActions<OI, N> };

// functions

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

export function getSfObjects<OI>(_cfg: SfObjCfgIndex<OI>, _conn: ISfConnection): ISfObjects<OI> {

    function _escapeVal(objName: KeyOf<OI>, k: string, v: any): string {

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
        objName: KeyOf<OI>,
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
        objName: KeyOf<OI>,
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
                            return `( ${_constructFullQuery(oCfg.childTables[from] as KeyOf<OI>, select, where, limit)} )`;
                        }

                        if (oCfg.lookupTypes[from]) {
                            return _constructSelectStatement(oCfg.lookupTypes[from] as KeyOf<OI>, rst['select'], [...prefixes, from])
                        }
                    }
                }
            })
            .filter(Boolean)
            .join(', ');

    }

    function _constructWhereStatement(
        objName: KeyOf<OI>,
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
                                    return _constructWhereStatement(childObjName as KeyOf<OI>, objMaps, { prefixes: [...(prefixes || []), propName] })
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


    function _query<N extends KeyOf<OI>, S extends SfRootSelect<OI, N>>(
        from: N,
        select: S[],
        where?: SfRootWhere<OI, N>,
        orderBy?: SfRootOrderBy<OI, N>,
        limit?: number
    ): SfSelectActions<OI, N, S> {

        const soql = () => _constructFullQuery(from, from, select, where, orderBy, limit)

        return ({
            soql,
            get: async () => await _conn.query<SfRootSelectProjection<OI, N, S>>(soql()), // to get rid of promiselike,            
            limit: (limit: number) => _query(from, select, where, orderBy, limit)
        });
    }



    const sfObject = <N extends KeyOf<OI>>(from: N): SfObjActions<OI, N> => ({

        query: <S extends SfRootSelect<OI, N>>(q: { select: S[], where?: SfRootWhere<OI, N>, orderBy?: SfRootOrderBy<OI, N>, limit?: number }) => {
            const { select, where, orderBy, limit } = q;
            return _query(from, select, where, orderBy, limit);
        },

        update: async <R, O = never>(records: SfUpdate<OI[N]>[], options?: O) => await _conn.update<R, O>(from, records, options),

        create: async <R, O = never>(records: SfCreate<OI[N]>[], options?: O) => await _conn.create<R, O>(from, records, options),

        upsert: async <R, K extends CreatePrimitiveProps<OI[N]>, O = never>(records: SfUpsert<OI[N], K>[], key: K, options?: O) => await _conn.upsert<R, O>(from, records, key, options),

        select: <S extends SfRootSelect<OI, N>>(select: S[]) => ({

            ..._query(from, select),

            orderBy: (orderBy: SfRootOrderBy<OI, N>) => _query(from, select, undefined, orderBy),

            where: (where: SfRootWhere<OI, N>) => ({

                ..._query(from, select, where),

                orderBy: (orderBy: SfRootOrderBy<OI, N>) => _query(from, select, where, orderBy)
            })

        })
    });
    
    return (Object.keys(_cfg) as KeyOf<OI>[]).reduce((p, n) => ({ ...p, [n]: sfObject(n) }), {} as ISfObjects<OI>);

}