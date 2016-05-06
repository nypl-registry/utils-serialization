'use strict'
var uuid = require('node-uuid')
var db = require('nypl-registry-utils-database')
var normalize = require('nypl-registry-utils-normalize')

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
        objectUri: (data.objectUri) ? data.objectUri : null,
        objectLiteral: (data.objectLiteral) ? data.objectLiteral : null,
        objectLiteralType: (data.objectLiteralType) ? data.objectLiteralType : null,
        provo: {
          creator: 'RI',
          created: new Date(),
          source: (data.source) ? data.source : null,
          recordIdentifier: (data.recordIdentifier) ? data.recordIdentifier : null
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
  /**
  * Given max and min it will distrubute across the requested number as a array of objects and add the min to the total of each one.
  * This is used to divide up a range of numbers into more or less equal chunks, we add the min to it so they are valid bnumbers in the range
  * @param  {int} max number -
  * @param  {int} min number -
  * @param  {int} count - split among how many

  * @return {array} - an array of objects: { start: 12345, stop: 54321 }
  */
  this.returnDistributedArray = (max, min, count) => {
    var perBot = (max - min) / count
    return Array.from(new Array(count), (x, i) => {
      return {start: Math.floor(i * perBot + min), end: Math.floor((i + 1) * perBot + min)}
    })
  }

  /**
   * Looks up agents via name string or viaf id
   *
   * @param  {obj} resourceObj - The resource object
   * @param  {function} cb - callback
   */
  this.dereferenceAgents = function (resourceObj, cb) {
    var agentStrings = []
    var agentViafs = []
    var success = []
    resourceObj.agentDereference = {}

    // archives
    if (resourceObj.allAgentsString) agentStrings = resourceObj.allAgentsString
    if (resourceObj.allAgentsViaf) agentViafs = resourceObj.allAgentsViaf

    // mms
    if (resourceObj.allAgentsLcUri) agentViafs = resourceObj.allAgentsLcUri

    db.returnCollectionRegistry('agents', (err, agents) => {
      if (err) console.log(err)
      agents.find({ $or: [ {viaf: { $in: agentViafs }}, {lcId: { $in: agentViafs }} ] }).toArray((err, resultsViaf) => {
        if (err) console.log(err)
        agentViafs.forEach((viafId) => {
          resultsViaf.forEach((viafLookup) => {
            // it is a match on the viaf
            if (viafLookup.viaf.indexOf(viafId) > -1) {
              resourceObj.agentDereference[viafId] = viafLookup
              success.push(viafId)
            }
            // it might be a match on the LC
            if (viafLookup.lcId === viafId) {
              resourceObj.agentDereference[viafId] = viafLookup
              success.push(viafId)
            }
          })
        })

        // build a little lookup for the normalized to the controled term
        var normalizedToControled = {}
        var allNormalized = []
        agentStrings.forEach((viafString) => {
          var n = normalize.normalizeAndDiacritics(viafString)
          allNormalized.push(n)
          if (!normalizedToControled[n]) normalizedToControled[n] = []
          normalizedToControled[n].push(viafString)
        })
        agents.find({ nameNormalized: { $in: allNormalized } }).toArray((err, resultsString) => {
          if (err) console.log(err)
          allNormalized.forEach((stringId) => {
            resultsString.forEach((stringLookup) => {
              if (stringLookup.nameNormalized.indexOf(stringId) > -1) {
                normalizedToControled[stringId].forEach((controledString) => {
                  resourceObj.agentDereference[controledString] = stringLookup
                  success.push(normalizedToControled[stringId])
                })
              }
            })
          })
          // agentStrings.concat(agentViafs).forEach((id) => {
          //   if (success.indexOf(id) === -1) {
          //     console.log('No agent found for:', id, resourceObj._id)
          //   }
          // })
          cb(null, resourceObj)
        })
      })
    })
  }

  /**
   * Looks up term via name string or fast id
   *
   * @param  {obj} resourceObj - The resource object
   * @param  {function} cb - callback
   */
  this.dereferenceTerms = function (resourceObj, cb) {
    var termStrings = []
    var termFasts = []
    var success = []
    resourceObj.termDereference = {}
    resourceObj.termAgentsDereference = {}
    resourceObj.errorsTerms = []

    if (resourceObj.allTermsString) termStrings = resourceObj.allTermsString
    if (resourceObj.allTermsFast) termFasts = resourceObj.allTermsFast

    db.returnCollections({registryIngest: ['terms']}, (err, returnCollections) => {
      if (err) console.log(err)
      var terms = returnCollections.registryIngest.terms
      // var agents = returnCollections.registryIngest.agents

      terms.find({fast: { $in: termFasts }}).toArray((err, resultsFast) => {
        if (err) console.log(err)
        termFasts.forEach((fastId) => {
          resultsFast.forEach((fastLookup) => {
            if (fastLookup.fast === fastId) {
              resourceObj.termDereference[fastId] = fastLookup
              success.push(fastId)
            }
          })
        })

        // build a little lookup for the normalized to the controled term
        var normalizedToControled = {}
        var allNormalized = []
        var allNormalizedAgentTerms = []
        var normalizedToControledAgentTerms = {}
        termStrings.forEach((termString) => {
          var n = normalize.singularize(normalize.normalizeAndDiacritics(termString))
          allNormalized.push(n)
          if (!normalizedToControled[n]) normalizedToControled[n] = []
          normalizedToControled[n].push(termString)
        })
        terms.find({ termNormalized: { $in: allNormalized } }).toArray((err, termString) => {
          if (err) console.log(err)
          allNormalized.forEach((stringId) => {
            termString.forEach((stringLookup) => {
              if (stringLookup.termNormalized.indexOf(stringId) > -1) {
                normalizedToControled[stringId].forEach((controledString) => {
                  resourceObj.termDereference[controledString] = stringLookup
                  success.push(controledString)
                })
              }
            })
          })
          termStrings.forEach((stringLookup) => {
            // we could not find this term, store it for lookup in the agents collection
            if (success.indexOf(stringLookup) === -1 && stringLookup.search('--') === -1) {
              // console.log('Could not find ', stringLookup)
              resourceObj.errorsTerms.push(stringLookup)
              var n = normalize.normalizeAndDiacritics(stringLookup)
              allNormalizedAgentTerms.push(n)
              if (!normalizedToControledAgentTerms[n]) normalizedToControledAgentTerms[n] = []
              normalizedToControledAgentTerms[n].push(termString)
            }
          })
          // Something to look into later

          // check here for terms that are actually agents
          // try to reconcile them to geographic terms first before going on to people/corps
          // also check to see they look like names (?maybe) things like spaces, if it can't match to a small one to
          // if (allNormalizedAgentTerms.length > 0) {
          //   console.log('>>>', allNormalizedAgentTerms)
          //   agents.find({ nameNormalized: { $in: allNormalizedAgentTerms } }).toArray((err, agentStrings) => {
          //     if (err) console.log(err)
          //     console.log(agentStrings)
          //     // allNormalized.forEach((stringId) => {
          //     //   termString.forEach((stringLookup) => {
          //     //     if (stringLookup.termNormalized.indexOf(stringId) > -1) {
          //     //       normalizedToControled[stringId].forEach((controledString) => {
          //     //         resourceObj.termDereference[controledString] = stringLookup
          //     //         success.push(controledString)
          //     //       })
          //     //     }
          //     //   })
          //     // })
          //     cb(null, resourceObj)
          //   })
          // } else {
          //   cb(null, resourceObj)
          // }
          cb(null, resourceObj)
        // console.log(resourceObj._id)
        // console.log(termStrings)
        // console.log(resourceObj.termDereference)
        })
      })
    })
  }
}

module.exports = exports = new UtilsSerialization()
