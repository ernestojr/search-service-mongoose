const reduce = require('lodash/reduce')
const split = require('lodash/split')
const startsWith = require('lodash/startsWith')
const includes = require('lodash/includes')
const map = require('lodash/map')

module.exports = class SearchService {
  static search(model, criteria = {}, params = {}) {
    return new Promise((resolve, reject) => {
      params = normalizeParams(params)
      const { all } = params
      const opts = buildOptions(params)
      getCollection(model, criteria, opts)
      .then(collection => setPopulations(model, collection, params))
      .then(collection => Promise.all([collection, all ? {} : buildHeaders(model, criteria, params)]))
      .then(([collection, pagination]) => resolve({ collection, pagination }))
      .catch(reject)
    })
  }
  static searchOne(model, criteria = {}, params = {}) {
    return new Promise((resolve, reject) => {
      const fields = buidFields(params.fields, true)
      model.findOne(criteria, fields)
      .then(document => setPopulations(model, document, params))
      .then(resolve)
      .catch(reject)
    })
  }
}

function normalizeParams(params) {
  const {
    uri = '',
    page = 1,
    limit = 10,
    orderBy = '-_id',
    fields = null,
    populations = null,
    isCriteriaPipeline = false,
    all = false
  } = params
  return {
    uri,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    orderBy,
    fields,
    populations,
    isCriteriaPipeline,
    all
  }
}

function buildOptions({ page, limit, orderBy, fields, all, isCriteriaPipeline }) {
  orderBy = buildCriteriaOrder(orderBy)
  fields = buidFields(fields)
  if (all) {
    return { fields, orderBy, isCriteriaPipeline }
  }
  const skip = buildSkip(page, limit)
  limit = { $limit: limit }
  return { fields, skip, limit, orderBy, isCriteriaPipeline }
}

function buildCriteriaOrder(orderBy) {
  orderBy = orderBy.split(',')
  orderBy = orderBy.reduce((result, field) => {
    if (field.startsWith('-')) {
      result[field.substring(1)] = -1
    } else {
      result[field] = 1
    }
    return result
  }, {})
  return { $sort: orderBy }
}

function buildSkip(page, limit) {
  const skip = (page - 1) * limit
  return { $skip: skip }
}

function buidFields(fields, isEase = false) {
  let allowedFields;
  if (!fields || typeof fields !== 'object' || typeof fields !== 'string') {
    allowedFields = {};
  }
  if (typeof fields === 'string') {
    allowedFields = map(split(fields, ','), field => field.trim());
    allowedFields = allowedFields.reduce((result, field) => {
      result[startsWith(field, '-') ? field.substring(1): field] = startsWith(field, '-') ? 0 : 1;
      return result;
    }, {});
  }
  return isEase ? allowedFields : { $project: allowedFields };
}

function getCollection(model, criteria, opts) {
  const { fields, skip, limit, orderBy, isCriteriaPipeline } = opts
  let query
  if (isCriteriaPipeline) {
    query = criteria.slice()
    query.push(orderBy)
  } else {
    query = [
      { $match: criteria },
      orderBy
    ]
  }
  if (skip && limit) {
    query.push(skip, limit)
  }
  if (fields) query.push(fields)
  return model.aggregate(query)
}

function setPopulations(model, collection, { populations }) {
  if (populations) {
    return model.populate(collection, populations)
  }
  return Promise.resolve(collection)
}

function buildHeaders(model, criteria, { limit, isCriteriaPipeline }) {
  return new Promise((resolve, reject) => {
    if (!isCriteriaPipeline) {
      model.count(criteria)
      .then(count => {
        resolve({
          'X-Pagination-Total-Count': count,
          'X-Pagination-Limit': limit,
        })
      })
      .catch(reject)
    } else {
      const pipeline = criteria.slice()
      pipeline.push({ $count: 'count' })
      model.aggregate(pipeline)
      .then(result => {
        resolve({
          'X-Pagination-Total-Count': result.length > 0 ? result[0].count : 0,
          'X-Pagination-Limit': limit,
        })
      })
    }
  })
}
