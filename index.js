'use strict'
var uuid = require('node-uuid')
var db = require('nypl-registry-utils-database')

function UtilsSerialization () {
  /**
   * Creates a resource object that triples can be appended to
   *
   * @param  {useUri} int - If we want to use a specifc int for the URI pass, otherwise it will create a temporay one
   */
  this.ResourceObject = function (useUri) {
    this.triples = { }

    if (useUri) {
      this.uri = useUri
    } else {
      this.uri = 'temp' + uuid.v4()
    }

    this.allAgents = []
    this.allTerms = []

    this.addTriple = function (data) {
      // can have predicate, objectUri, objectLiteral, objectLiteralType, source, recordIdentifier, label
      // does this predicate already exist?
      if (!this.triples[data.predicate]) this.triples[data.predicate] = []
      this.triples[data.predicate].push({
        id: uuid.v4(),
        objectUri: data.objectUri,
        objectLiteral: data.objectLiteral,
        objectLiteralType: data.objectLiteralType,
        provo: {
          creator: 'RI',
          created: new Date(),
          source: data.source,
          recordIdentifier: data.recordIdentifier
        }
      })
      if (data.label) {
        this.triples[data.predicate][this.triples[data.predicate].length - 1].label = data.label
      }
    }
  }

  /**
   * Marks in the serialized collection that a specific host record was completed
   *
   * @param  {id} string - The unique host system identifier
   * @param  {function} cb - callback, nothing returned
   */
  this.markSerialized = function (id, cb) {
    db.returnCollectionRegistry('serialized', (err, serialized) => {
      if (err) console.log(err)
      serialized.insert({ _id: id }, (err, record) => {
        if (err) console.log(err)
        if (cb) cb()
      })
    })
  }
  /**
   * Checks the serialized collection to see if a specific host record was completed
   *
   * @param  {id} string - The unique host system identifier
   * @param  {function} cb - callback, returns true/false
   */
  this.checkSerialized = function (id, cb) {
    db.returnCollectionRegistry('serialized', (err, serialized) => {
      if (err) console.log(err)
      serialized.find({ _id: id }).toArray((err, record) => {
        if (err) console.log(err)
        if (record.length > 0) {
          cb(true)
        } else {
          cb(false)
        }
      })
    })
  }
}

module.exports = exports = new UtilsSerialization()
