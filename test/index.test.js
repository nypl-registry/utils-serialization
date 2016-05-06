/* global describe, it */

'use strict'
var assert = require('assert') // eslint-disable-line
var should = require('should') // eslint-disable-line
var utils = require('../index.js')
var data = null

describe('utils', function () {
  it('it should build a resource object based on various data passed - use uri', () => {
    var obj = new utils.ResourceObject(12345)
    obj.uri.should.equal(12345)
  })

  data = {
    predicate: 'rdf:type'
  }
  it('it should build a resource object based on various data passed - predicate', () => {
    var obj = new utils.ResourceObject()
    obj.addTriple(data)
    should.exist(obj.triples['rdf:type'])
  })
  it('it should build a resource object based on various data passed - predicate x 2', () => {
    var obj = new utils.ResourceObject()
    obj.addTriple(data)
    obj.addTriple(data)
    obj.triples['rdf:type'].length.should.equal(2)
  })
  it('it should build a resource object based on various data passed - object uri', () => {
    data = {
      predicate: 'rdf:type',
      objectUri: 'nypl:Resource'
    }
    var obj = new utils.ResourceObject()
    obj.addTriple(data)
    obj.triples['rdf:type'][0].objectUri.should.equal('nypl:Resource')
  })
  it('it should build a resource object based on various data passed - object literal', () => {
    data = {
      predicate: 'dcterms:title',
      objectLiteral: 'Hi :)'
    }
    var obj = new utils.ResourceObject()
    obj.addTriple(data)
    obj.triples['dcterms:title'][0].objectLiteral.should.equal('Hi :)')
  })
  it('it should build a resource object based on various data passed - object objectLiteralType', () => {
    data = {
      predicate: 'dcterms:title',
      objectLiteral: 'Hi :)',
      objectLiteralType: '@en'
    }
    var obj = new utils.ResourceObject()
    obj.addTriple(data)
    obj.triples['dcterms:title'][0].objectLiteralType.should.equal('@en')
  })
  it('it should build a resource object based on various data passed - source', () => {
    data = {
      predicate: 'dcterms:title',
      objectLiteral: 'Hi :)',
      objectLiteralType: '@en',
      source: 'shadowcat',
      recordIdentifier: 12345
    }
    var obj = new utils.ResourceObject()
    obj.addTriple(data)
    obj.triples['dcterms:title'][0].provo.source.should.equal('shadowcat')
    obj.triples['dcterms:title'][0].provo.recordIdentifier.should.equal(12345)
  })
  it('it should build a resource object based on various data passed - label', () => {
    data = {
      predicate: 'rdf:type',
      objectUri: 'nypl:Capture',
      label: 'capture here'
    }
    var obj = new utils.ResourceObject()
    obj.addTriple(data)
    obj.triples['rdf:type'][0].label.should.equal('capture here')
  })
})
