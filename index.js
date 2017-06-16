const qs = require('querystring')

module.exports = class SearchService {
  static search(model, criteria = {}, params = {}) {
    return new Promise((resolve, reject) => {
      params = normalizeParams(params)
      const opts = buildOptions(params)
      getCollection(model, criteria, opts)
      .then(collection => setPopulations(model, collection, params))
      .then(collection => {
        const pagiation = buildHeaders(collection, params)
        resolve({ collection, pagiation })
      })
      .catch(err => reject)
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
  } = params
  return { uri, page, limit, orderBy, fields, populations }
}

function buildOptions({ page, limit, orderBy, fields }) {
  orderBy = buildCriteriaOrder(orderBy)
  const skip = buildSkip(page, limit)
  limit = { $limit: limit }
  fields = buidFields(fields)
  return { fields, skip, limit, orderBy }
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

function buidFields(fields) {
  if (!fields) return null
  fields = fields.split(',')
  fields = fields.reduce((result, field) => {
    result[field.trim()] = 1
    return result
  }, {})
  return { $project: fields }
}

function getCollection(model, criteria, opts) {
  const { fields, skip, limit, orderBy } = opts
  const query = [
    { $match: criteria },
    orderBy,
    skip,
    limit,
  ]
  if (fields) query.push(fields)
  return model.aggregate(query)
}

function setPopulations(model, collection, { populations }) {
  if (populations) {
    return model.populate(collection, populations)
  }
  return Promise.resolve(collection)
}

function buildHeaders(values, params) {
  const { uri, page, limit, orderBy, fields } = params
  const pagination = {
    'X-Pagination-Total-Count': values.length,
  }
  const link = []
  if (page > 1) {
    const queryString = qs.stringify({ page: page - 1, limit, orderBy, fields })
    const prevUrl = `${uri}?${queryString}`
    link.push(`<${prevUrl}>; rel="prev"`)
  }
  if (values.length === limit) {
    const queryString = qs.stringify({ page: page + 1, limit, orderBy, fields })
    const nextUrl = `${uri}?${queryString}`
    link.push(`<${nextUrl}>; rel="next"`)
  }
  pagination['Link'] = link.toString()
  return pagination
}
