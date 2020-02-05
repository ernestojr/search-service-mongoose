const Fakerator = require('fakerator');
const mongoose = require('mongoose');
const SearchService = require('../index.js');
const expect = require('chai').expect;

let Owner, Vet, Cat, catId;

const fakerator = Fakerator("es-ES");
mongoose.Promise = global.Promise;
const connection = mongoose.createConnection('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });

describe('Search Service Mongoose Test', () => {

  it('Should get owners in db', async () => {
    const query = {
      uri: 'uri to resource',
      orderBy: 'firstName',
      fields: 'firstName, lastName, address',
    };
    const owners = await SearchService.search(Owner, {}, query);
    expect(owners).to.have.property('collection');
    owners.collection.map(owner => {
      expect(owner).to.have.property('firstName');
      expect(owner).to.have.property('lastName');
      expect(owner).to.have.property('address');
    });
    expect(owners).to.have.property('pagination');
    expect(owners.pagination).to.have.property('X-Pagination-Total-Count');
    expect(owners.pagination).to.have.property('X-Pagination-Limit');
  });

  it('Should get vets in db', async () => {
    const query = {
      uri: 'uri to resource',
      orderBy: 'firstName',
      fields: 'firstName, lastName, clients',
    };
    const vets = await SearchService.search(Vet, {}, query);
    expect(vets).to.have.property('collection');
    vets.collection.map(vet => {
      expect(vet).to.have.property('firstName');
      expect(vet).to.have.property('lastName');
      expect(vet).to.have.property('clients');
    });
    expect(vets).to.have.property('pagination');
    expect(vets.pagination).to.have.property('X-Pagination-Total-Count');
    expect(vets.pagination).to.have.property('X-Pagination-Limit');
  });

  it('Should get cats in db', async () => {
    const query = {
      uri: 'uri to resource',
      orderBy: 'name',
      fields: 'name, months, owner, vet',
    };
    const cats = await SearchService.search(Cat, {}, query);
    expect(cats).to.have.property('collection');
    cats.collection.map(cat => {
      expect(cat).to.have.property('name');
      expect(cat).to.have.property('months');
      expect(cat).to.have.property('owner');
      expect(cat).to.have.property('vet');
    });
    expect(cats).to.have.property('pagination');
    expect(cats.pagination).to.have.property('X-Pagination-Total-Count');
    expect(cats.pagination).to.have.property('X-Pagination-Limit');
  });

  it('Should get all cats in db', async () => {
    const query = {
      uri: 'uri to resource',
      orderBy: 'name',
      all: true,
      fields: 'name, months, owner, vet',
    };
    const cats = await SearchService.search(Cat, {}, query);
    expect(cats).to.have.property('collection');
    cats.collection.map(cat => {
      expect(cat).to.have.property('name');
      expect(cat).to.have.property('months');
      expect(cat).to.have.property('owner');
      expect(cat).to.have.property('vet');
    });
    expect(cats).to.have.property('pagination');
    expect(cats.pagination).to.not.have.property('X-Pagination-Total-Count');
    expect(cats.pagination).to.not.have.property('X-Pagination-Limit');
  });

  it('Should get one cat by id in db with isCriteriaPipeline in true', async () => {
    const query = {
      fields: 'name, months, owner, vet',
      populations: 'owner vet',
      isCriteriaPipeline: true,
    };
    const criteria = [
      { $match: { _id:  mongoose.Types.ObjectId(catId) } }
    ];
    const result = await SearchService.search(Cat, criteria, query);
    expect(result).to.have.property('collection');
    result.collection.map(cat => {
      expect(cat).to.have.property('name');
      expect(cat).to.have.property('months');
      expect(cat).to.have.property('owner');
      expect(cat).to.have.property('vet');
    });
    expect(result).to.have.property('pagination');
    expect(result.pagination).to.have.property('X-Pagination-Total-Count');
    expect(result.pagination).to.have.property('X-Pagination-Limit');
  });

  it('Should get one cat by id in db with allowDiskUse in true', async () => {
    const query = {
      fields: 'name, months, owner, vet',
      populations: 'owner vet',
      isCriteriaPipeline: true,
      allowDiskUse: true,
    };
    const criteria = [
      { $match: { _id:  mongoose.Types.ObjectId(catId) } }
    ];
    const result = await SearchService.search(Cat, criteria, query);
    expect(result).to.have.property('collection');
    result.collection.map(cat => {
      expect(cat).to.have.property('name');
      expect(cat).to.have.property('months');
      expect(cat).to.have.property('owner');
      expect(cat).to.have.property('vet');
    });
    expect(result).to.have.property('pagination');
    expect(result.pagination).to.have.property('X-Pagination-Total-Count');
    expect(result.pagination).to.have.property('X-Pagination-Limit');
  });

  it('Should get one cat by id without field name in db', async () => {
    const query = {
      fields: '-name',
      populations: 'owner vet',
    };
    let cat = await SearchService.searchOne(Cat, { _id: catId }, query);
    cat = cat.toJSON();
    expect(cat).to.not.have.property('name');
    expect(cat).to.have.property('months');
    expect(cat).to.have.property('owner');
    expect(cat).to.have.property('vet');
  });

  before(async () => {
    Owner = connection.model('Owner', {
      firstName: { type: String },
      lastName: { type: String },
      address: { type: mongoose.Schema.Types.Mixed },
      createdAt: { type: Date, default: Date.now },
    });
    Vet = connection.model('Vet', {
      firstName: { type: String },
      lastName: { type: String },
      clients: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Owner' }] },
      createdAt: { type: Date, default: Date.now },
    });
    Cat = connection.model('Cat', {
      name: { type: String },
      months: { type: Number },
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
      vet: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet' },
      createdAt: { type: Date, default: Date.now },
    });
    let owners = [];
    for (var i = 0; i < 25; i++) {
      owners.push(Owner.create({
        firstName: fakerator.names.firstName(),
        lastName: fakerator.names.lastName(),
        address: fakerator.entity.address(),
      }));
    }
    owners = await Promise.all(owners);
    let vets = owners.map(owner => Vet.create({
      firstName: fakerator.names.firstName(),
      lastName: fakerator.names.lastName(),
      clients: [owner._id],
    }));
    vets = await Promise.all(vets);
    let cats = owners.map((owner, index) => Cat.create({
      name: fakerator.names.name(),
      months: fakerator.random.number(12),
      owner: owner._id,
      vet: vets[index]._id,
    }));
    cats = await Promise.all(cats);
    catId = cats[0]._id;
  });

  after(async () => {
    await Cat.deleteMany,({});
    await Vet.deleteMany,({});
    await Owner.deleteMany,({});
  });

});
