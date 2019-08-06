import {
  TreeRepository,
  Connection,
  ObjectType,
  getManager,
  EntityRepository,
  ObjectLiteral,
  SelectQueryBuilder,
} from "typeorm";
import * as typeorm from "typeorm";
import { AbstractSqliteDriver } from "typeorm/driver/sqlite-abstract/AbstractSqliteDriver";

/**
 *TreeRepository拡張クラス
 *
 * @export
 * @class ExtendRepository
 * @extends {TreeRepository<Entity>}
 * @template Entity
 */
@EntityRepository()
export class ExtendRepository<Entity> extends TreeRepository<Entity> {
  /**
   *Creates an instance of ExtendRepository.
   * @param {Connection} connection
   * @param {ObjectType<Entity>} entity
   * @memberof ExtendRepository
   */
  constructor(connection: Connection, entity: ObjectType<Entity>) {
    super();
    let manager;
    try {
      manager = getManager(connection.name);
    } catch {
      manager = new typeorm.EntityManager(connection);
    }

    const metadata = connection.getMetadata(entity);
    const queryRunner = manager.queryRunner;
    Object.assign(this, {
      manager: manager,
      metadata: metadata,
      queryRunner: queryRunner
    });
  }
  /**
   *起点から親方向へデータの取得
   *
   * @param {(Entity | [string, { [key: string]: string | number | boolean }])} entity
   * @param {({
   *       select?: (keyof Entity)[];
   *     })} [options]
   * @returns {Promise<Entity>}
   * @memberof ExtendRepository
   */
  async getParent(
    entity: Entity | [string, { [key: string]: string | number | boolean }],
    options?: {
      select?: (keyof Entity)[];
      where?:
        | string
        | typeorm.Brackets
        | ((qb: SelectQueryBuilder<Entity>) => string);
      parameters?: ObjectLiteral | undefined;
      order?: string | [string, "ASC" | "DESC", "NULLS FIRST" | "NULLS LAST"];
    }
  ): Promise<Entity | undefined> {
    let builder: SelectQueryBuilder<Entity>;

    builder = this.createAncestorsQueryBuilder(
      "treeEntity",
      "treeClosure",
      entity
    );

    if (options) {
      if (options.select) {
        const parents = this.metadata.treeParentRelation!.foreignKeys[0]
          .columnNames;
        builder.select([
          ...options.select.map(v => {
            return "treeEntity." + v;
          }),
          ...parents.map(v => {
            return "treeEntity." + v;
          })
        ]);
      }
      if (options.where) builder.andWhere(options.where);
      if (options.order)
        if (typeof options.order === "string") builder.orderBy(options.order);
        else builder.orderBy(...options.order);
    }

    const entitiesAndScalars = await builder.getRawAndEntities();
    if (entitiesAndScalars.raw.length === 0) return undefined;
    const relationMaps = this.createRelationMaps(
      "treeEntity",
      entitiesAndScalars.raw
    );

    //起点の取得
    const ids = new Set<number>();
    relationMaps.forEach(e => ids.add(e.parentId));
    let index: number;
    for (index = 0; ids.has(relationMaps[index].id); ++index);

    this.buildParentEntityTree(
      entitiesAndScalars.entities[index],
      entitiesAndScalars.entities,
      relationMaps
    );
    return entitiesAndScalars.entities[index];
  }
  /**
   *起点から子方向へツリー構造のデータを取得
   *
   * @param {(Entity | [string, { [key: string]: string | number | boolean }])} entity　起点
   * @param {{
   *       select?: (keyof Entity)[];　抽出フィールド
   *     }} [options]
   * @returns {Promise<Entity>}
   * @memberof ExtendRepository
   */
  async getChildren(
    entity: Entity | [string, { [key: string]: string | number | boolean }],
    options?: {
      select?: (keyof Entity)[];
      where?:
        | string
        | typeorm.Brackets
        | ((qb: SelectQueryBuilder<Entity>) => string);
      parameters?: ObjectLiteral | undefined;
      order?: string | [string, "ASC" | "DESC", "NULLS FIRST" | "NULLS LAST"];
    }
  ): Promise<Entity | undefined> {
    let builder: SelectQueryBuilder<Entity>;

    builder = this.createDescendantsQueryBuilder(
      "treeEntity",
      "treeClosure",
      entity
    );

    if (options) {
      if (options.select) {
        const parents = this.metadata.treeParentRelation!.foreignKeys[0]
          .columnNames;
        builder.select([
          ...options.select.map(v => {
            return "treeEntity." + v;
          }),
          ...parents.map(v => {
            return "treeEntity." + v;
          })
        ]);
      }
      if (options.where) builder.andWhere(options.where);
      if (options.order)
        if (typeof options.order === "string") builder.orderBy(options.order);
        else builder.orderBy(...options.order);
    }

    const entitiesAndScalars = await builder.getRawAndEntities();
    if (entitiesAndScalars.raw.length === 0) return undefined;
    const relationMaps = this.createRelationMaps(
      "treeEntity",
      entitiesAndScalars.raw
    );

    //起点の取得
    const ids = new Set<number>();
    relationMaps.forEach(e => ids.add(e.id));
    let index: number;
    for (index = 0; ids.has(relationMaps[index].parentId); ++index);

    this.buildChildrenEntityTree(
      entitiesAndScalars.entities[index],
      entitiesAndScalars.entities,
      relationMaps
    );
    return entitiesAndScalars.entities[index];
  }
  public createAncestorsQueryBuilder(
    alias: string,
    closureTableAlias: string,
    entity: Entity | [string, { [key: string]: string | number | boolean }]
  ): SelectQueryBuilder<Entity> {
    if (this.metadata.treeType === "closure-table") {
      const joinCondition = this.metadata.closureJunctionTable.ancestorColumns
        .map(column => {
          return (
            closureTableAlias +
            "." +
            column.propertyPath +
            " = " +
            alias +
            "." +
            column.referencedColumn!.propertyPath
          );
        })
        .join(" AND ");

      const parameters: ObjectLiteral = {};
      const whereCondition = this.metadata.closureJunctionTable.ancestorColumns
        .map(column => {
          if (entity instanceof Array) {
            const qb = this.createQueryBuilder();
            Object.assign(parameters, entity[1]);
            return (
              escape(closureTableAlias) +
              "." +
              escape(column.propertyPath) +
              " = " +
              qb
                .subQuery()
                .select(column.referencedColumn!.propertyName)
                .from(this.metadata.target, this.metadata.targetName)
                .where(entity[0])
                .getQuery()
            );
          } else {
            parameters[
              column.referencedColumn!.propertyName
            ] = column.referencedColumn!.getEntityValue(entity);
            return (
              escape(closureTableAlias) +
              "." +
              escape(column.propertyPath) +
              " = :" +
              column.referencedColumn!.propertyName
            );
          }
        })
        .join(" AND ");

      return this.createQueryBuilder(alias)
        .innerJoin(
          this.metadata.closureJunctionTable.tableName,
          closureTableAlias,
          joinCondition
        )
        .where(whereCondition)
        .setParameters(parameters);
    } else if (this.metadata.treeType === "nested-set") {
      const joinCondition =
        "joined." +
        this.metadata.nestedSetLeftColumn!.propertyPath +
        " BETWEEN " +
        alias +
        "." +
        this.metadata.nestedSetLeftColumn!.propertyPath +
        " AND " +
        alias +
        "." +
        this.metadata.nestedSetRightColumn!.propertyPath;
      const parameters: ObjectLiteral = {};
      const whereCondition = this.metadata
        .treeParentRelation!.joinColumns.map(joinColumn => {
          const parameterName = joinColumn.referencedColumn!.propertyPath.replace(
            ".",
            "_"
          );
          if (entity instanceof Array) {
            const qb = this.createQueryBuilder();
            Object.assign(parameters, entity[1]);
            return (
              "joined." +
              joinColumn.referencedColumn!.propertyPath +
              " = " +
              qb
                .subQuery()
                .select(parameterName)
                .from(this.metadata.target, this.metadata.name)
                .where(entity[0])
                .getQuery()
            );
          } else {
            parameters[
              parameterName
            ] = joinColumn.referencedColumn!.getEntityValue(entity);
            return (
              "joined." +
              joinColumn.referencedColumn!.propertyPath +
              " = :" +
              parameterName
            );
          }
        })
        .join(" AND ");

      return this.createQueryBuilder(alias).innerJoin(
        this.metadata.targetName,
        "joined",
        joinCondition + " AND " + whereCondition,
        parameters
      );
    } else if (this.metadata.treeType === "materialized-path") {
      // example: SELECT * FROM category category WHERE (SELECT mpath FROM `category` WHERE id = 2) LIKE CONCAT(category.mpath, '%');
      return this.createQueryBuilder(alias).where(qb => {
        const subQuery = qb
          .subQuery()
          .select(
            `${this.metadata.targetName}.${
              this.metadata.materializedPathColumn!.propertyPath
            }`,
            "path"
          )
          .from(this.metadata.target, this.metadata.targetName);
        if (entity instanceof Array) subQuery.where(entity[0], entity[1]);
        else subQuery.whereInIds(this.metadata.getEntityIdMap(entity));

        qb.setNativeParameters(subQuery.expressionMap.nativeParameters);
        if (this.manager.connection.driver instanceof AbstractSqliteDriver) {
          return `${subQuery.getQuery()} LIKE ${alias}.${
            this.metadata.materializedPathColumn!.propertyPath
          } || '%'`;
        } else {
          return `${subQuery.getQuery()} LIKE CONCAT(${alias}.${
            this.metadata.materializedPathColumn!.propertyPath
          }, '%')`;
        }
      });
    }

    throw new Error(`Supported only in tree entities`);
  }
  public createDescendantsQueryBuilder(
    alias: string,
    closureTableAlias: string,
    entity: Entity | [string, { [key: string]: string | number | boolean }]
  ): SelectQueryBuilder<Entity> {
    // create shortcuts for better readability
    const escape = (alias: string) =>
      this.manager.connection.driver.escape(alias);

    if (this.metadata.treeType === "closure-table") {
      const joinCondition = this.metadata.closureJunctionTable.descendantColumns
        .map(column => {
          return (
            escape(closureTableAlias) +
            "." +
            escape(column.propertyPath) +
            " = " +
            escape(alias) +
            "." +
            escape(column.referencedColumn!.propertyPath)
          );
        })
        .join(" AND ");

      const parameters: ObjectLiteral = {};
      const whereCondition = this.metadata.closureJunctionTable.ancestorColumns
        .map(column => {
          if (entity instanceof Array) {
            const qb = this.createQueryBuilder();
            Object.assign(parameters, entity[1]);
            return (
              escape(closureTableAlias) +
              "." +
              escape(column.propertyPath) +
              " = " +
              qb
                .subQuery()
                .select(column.referencedColumn!.propertyName)
                .from(this.metadata.target, this.metadata.targetName)
                .where(entity[0])
                .getQuery()
            );
          } else {
            parameters[
              column.referencedColumn!.propertyName
            ] = column.referencedColumn!.getEntityValue(entity);
            return (
              escape(closureTableAlias) +
              "." +
              escape(column.propertyPath) +
              " = :" +
              column.referencedColumn!.propertyName
            );
          }
        })
        .join(" AND ");

      return (
        this.createQueryBuilder(alias)
          .innerJoin(
            this.metadata.closureJunctionTable.tableName,
            closureTableAlias,
            joinCondition + " AND " + whereCondition
          )
          //.where(whereCondition)
          .setParameters(parameters)
      );
    } else if (this.metadata.treeType === "nested-set") {
      const whereCondition =
        alias +
        "." +
        this.metadata.nestedSetLeftColumn!.propertyPath +
        " BETWEEN " +
        "joined." +
        this.metadata.nestedSetLeftColumn!.propertyPath +
        " AND joined." +
        this.metadata.nestedSetRightColumn!.propertyPath;
      const parameters: ObjectLiteral = {};
      const joinCondition = this.metadata
        .treeParentRelation!.joinColumns.map(joinColumn => {
          const parameterName = joinColumn.referencedColumn!.propertyPath.replace(
            ".",
            "_"
          );
          if (entity instanceof Array) {
            const qb = this.createQueryBuilder();
            Object.assign(parameters, entity[1]);
            return (
              "joined." +
              joinColumn.referencedColumn!.propertyPath +
              " = " +
              qb
                .subQuery()
                .select(parameterName)
                .from(this.metadata.target, this.metadata.name)
                .where(entity[0])
                .getQuery()
            );
          } else {
            parameters[
              parameterName
            ] = joinColumn.referencedColumn!.getEntityValue(entity);
            return (
              "joined." +
              joinColumn.referencedColumn!.propertyPath +
              " = :" +
              parameterName
            );
          }
        })
        .join(" AND ");

      return this.createQueryBuilder(alias).innerJoin(
        this.metadata.targetName,
        "joined",
        whereCondition + " AND " + joinCondition,
        parameters
      );
      //.where(joinCondition, parameters);
    } else if (this.metadata.treeType === "materialized-path") {
      return this.createQueryBuilder(alias).where(qb => {
        const subQuery = qb
          .subQuery()
          .select(
            `${this.metadata.targetName}.${
              this.metadata.materializedPathColumn!.propertyPath
            }`,
            "path"
          )
          .from(this.metadata.target, this.metadata.targetName);
        if (entity instanceof Array) subQuery.where(entity[0], entity[1]);
        else subQuery.whereInIds(this.metadata.getEntityIdMap(entity));

        qb.setNativeParameters(subQuery.expressionMap.nativeParameters);
        if (this.manager.connection.driver instanceof AbstractSqliteDriver) {
          return `${alias}.${
            this.metadata.materializedPathColumn!.propertyPath
          } LIKE ${subQuery.getQuery()} || '%'`;
        } else {
          return `${alias}.${
            this.metadata.materializedPathColumn!.propertyPath
          } LIKE CONCAT(${subQuery.getQuery()}, '%')`;
        }
      });
    }

    throw new Error(`Supported only in tree entities`);
  }
}
