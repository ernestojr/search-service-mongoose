const Fakerator = require('fakerator')
const mongoose = require('mongoose')
const SearchService = require('../index.js')
const expect = require('chai').expect

let Owner, Vet, Cat, catId

const fakerator = Fakerator("es-ES")
mongoose.Promise = global.Promise
mongoose.connect('mongodb://localhost/test')

describe('Search Service Mongoose Test', () => {
  before(createModelsAndDocuments)
  after(deleteDocuments)

  it('Should get owners in db', () => {
    const query = {
      uri: 'uri to resource',
      orderBy: 'firstName',
      fields: 'firstName, lastName, address',
    }
    SearchService.search(Owner, {}, query)
    .then(owners => {
      expect(owners).to.have.property('collection')
      owners.collection.map(owner => {
        expect(owner).to.have.property('firstName')
        expect(owner).to.have.property('lastName')
        expect(owner).to.have.property('address')
      })
      expect(owners).to.have.property('pagination')
    })
    .catch(err => console.error('Owners', err))
  })

  it('Should get vets in db', () => {
    const query = {
      uri: 'uri to resource',
      orderBy: 'firstName',
      fields: 'firstName, lastName, clients',
    }
    SearchService.search(Vet, {}, query)
    .then(vets => {
      expect(vets).to.have.property('collection')
      vets.collection.map(vet => {
        expect(vet).to.have.property('firstName')
        expect(vet).to.have.property('lastName')
        expect(vet).to.have.property('clients')
      })
      expect(vets).to.have.property('pagination')
    })
    .catch(err => console.error('Vets', err))
  })

  it('Should get cats in db', () => {
    const query = {
      uri: 'uri to resource',
      orderBy: 'name',
      fields: 'name, months, owner, vet',
    }
    SearchService.search(Cat, {}, query)
    .then(cats => {
      expect(cats).to.have.property('collection')
      cats.collection.map(cat => {
        expect(cat).to.have.property('name')
        expect(cat).to.have.property('months')
        expect(cat).to.have.property('owner')
        expect(cat).to.have.property('vet')
      })
      expect(cats).to.have.property('pagination')
    })
    .catch(err => console.error('Cats', err))
  })

  it('Should get all cats in db', () => {
    const query = {
      uri: 'uri to resource',
      orderBy: 'name',
      all: true,
      fields: 'name, months, owner, vet',
    }
    SearchService.search(Cat, {}, query)
    .then(cats => {
      expect(cats).to.have.property('collection')
      cats.collection.map(cat => {
        expect(cat).to.have.property('name')
        expect(cat).to.have.property('months')
        expect(cat).to.have.property('owner')
        expect(cat).to.have.property('vet')
      })
      expect(cats).to.have.property('pagination')
    })
    .catch(err => console.error('Cats', err))
  })

  it('Should get one cat by id in db', () => {
    const query = {
      fields: 'name, months, owner, vet',
      populations: 'owner vet'
    }
    SearchService.searchOne(Cat, { _id: catId }, query)
    .then(cat => {
      expect(cat).to.have.property('name')
      expect(cat).to.have.property('months')
      expect(cat).to.have.property('owner')
      expect(cat).to.have.property('vet')
    })
    .catch(err => console.error('Cat', err))
  })

})

function createModelsAndDocuments(next) {
  Owner = mongoose.model('Owner', {
    firstName: { type: String },
    lastName: { type: String },
    address: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
  })

  Vet = mongoose.model('Vet', {
    firstName: { type: String },
    lastName: { type: String },
    clients: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Owner' }] },
    createdAt: { type: Date, default: Date.now }
  })

  Cat = mongoose.model('Cat', {
    name: { type: String },
    months: { type: Number },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    vet: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet' },
    createdAt: { type: Date, default: Date.now }
  })

  const promises = []

  for (var i = 0; i < 25; i++) {
    promises.push(Owner.create({
      firstName: fakerator.names.firstName(),
      lastName: fakerator.names.lastName(),
      address: fakerator.entity.address(),
    }))
  }

  Promise.all(promises)
  .then(owners => {
    const promises = owners.map(owner => Vet.create({
      firstName: fakerator.names.firstName(),
      lastName: fakerator.names.lastName(),
      clients: [owner._id]
    }))
    return Promise.all([owners, Promise.all(promises)])
  })
  .then(([owners, vets]) => {
    const promises = owners.map((owner, index) => Cat.create({
      name: fakerator.names.name(),
      months: fakerator.random.number(12),
      owner: owner._id,
      vet: vets[index]._id,
    }))
    return Promise.all(promises)
  })
  .then(cats => {
    catId = cats[0]._id
    next()
  })
  .catch(err => console.log(err))
}

function deleteDocuments(next) {
  Cat.remove({})
  .then(() => Vet.remove({}))
  .then(() => Owner.remove({}))
  .then(() => next())
  .catch(err => console.log(err))
}
