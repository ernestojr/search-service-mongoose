const Fakerator = require('fakerator')
const mongoose = require('mongoose')
const SearchService = require('../index.js')
const expect = require('chai').expect

let Owner, Vet, Cat

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
      console.log('Owners', owners)
      expect(owners).to.have.deep.property('collection')
      owners.map(owner => {
        expect(owner).to.have.deep.property('firstName')
        expect(owner).to.have.deep.property('lastName')
        expect(owner).to.have.deep.property('address')
      })
      expect(owners).to.have.deep.property('pagination')
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
      console.log('Vets', vets)
      expect(vets).to.have.deep.property('collection')
      vets.map(vet => {
        expect(vet).to.have.deep.property('firstName')
        expect(vet).to.have.deep.property('lastName')
        expect(vet).to.have.deep.property('clients')
      })
      expect(vets).to.have.deep.property('pagination')
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
      console.log('Cats', cats)
      expect(cats).to.have.deep.property('collection')
      cats.map(cat => {
        expect(cat).to.have.deep.property('name')
        expect(cat).to.have.deep.property('months')
        expect(cat).to.have.deep.property('owner')
        expect(cat).to.have.deep.property('vet')
      })
      expect(cats).to.have.deep.property('pagination')
    })
    .catch(err => console.error('Cats', err))
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
    console.log('owners', owners)
    const promises = owners.collection.map(owner => Vet.create({
      firstName: fakerator.names.firstName(),
      lastName: fakerator.names.lastName(),
      clients: [owner._id]
    }))
    return Promise.all([owners, Promise.all(promises)])
  })
  .then(([owners, vets]) => {
    console.log('vets', vets)
    const promises = owners.collection.map((owner, index) => Cat.create({
      name: fakerator.names.name(),
      months: fakerator.random.number(12),
      owner: owner._id,
      vet: vets.collection[index]._id,
    }))
    return Promise.all(promises)
  })
  .then(cats => {
    console.log('cats', cats)
    next()
  })
  .catch(err => console.log(err))
}

function functionName(next) {
  Cat.remove({})
  .then(() => Vet.remove({}))
  .then(() => Owner.remove({}))
  .then(() => next())
  .catch(err => console.log(err))
}
