'use strict'

const mainLogger = require('../../log')
const path = require('path')
const os = require('os')
const { inspect } = require('util')
const tracerVersion = require('../../../lib/version')

const logger = Object.create(mainLogger)
logger._enabled = true

let config
let instrumenter
let samplingRules = []

let alreadyRan = false

function getIntegrations () {
  const integrations = []
  for (const plugin of instrumenter._instrumented.keys()) {
    if (plugin.versions) {
      try {
        const version = require(path.join(plugin.name, 'package.json')).version
        integrations.push(`${plugin.name}@${version}`)
      } catch (e) {
        integrations.push(plugin.name)
      }
    } else {
      integrations.push(plugin.name)
    }
  }
  return Array.from(new Set(integrations))
}

function startupLog ({ agentError } = {}) {
  if (!config) {
    return
  }

  if (alreadyRan) {
    return
  }

  alreadyRan = true

  if (!config.startupLogsEnabled) {
    return
  }

  const url = config.url || `http://${config.hostname || 'localhost'}:${config.port}`

  const out = {
    [inspect.custom] () {
      return String(this)
    },
    toString () {
      return JSON.stringify(this)
    }
  }

  out.date = new Date().toISOString()
  out.os_name = os.type()
  out.os_version = os.release()
  out.architecture = os.arch()
  out.version = tracerVersion
  out.lang = 'nodejs'
  out.lang_version = process.versions.node
  out.env = config.env
  out.enabled = config.enabled
  out.scope_manager = config.scope
  out.service = config.service
  out.agent_url = url
  if (agentError) {
    out.agent_error = agentError.message
  }
  out.debug = !!config.debug
  out.analytics_enabled = !!config.analytics
  out.sample_rate = config.sampleRate
  out.sampling_rules = samplingRules
  out.tags = config.tags
  if (config.tags && config.tags.version) {
    out.dd_version = config.tags.version
  }

  out.log_injection_enabled = !!config.logInjection
  out.runtime_metrics_enabled = !!config.runtimeMetrics
  out.integrations_loaded = getIntegrations()

  // // This next bunch is for features supported by other tracers, but not this
  // // one. They may be implemented in the future.

  // out.enabled_cli
  // out.sampling_rules_error
  // out.integration_XXX_analytics_enabled
  // out.integration_XXX_sample_rate
  // out.service_mapping
  // out.service_mapping_error

  logger.info('DATADOG TRACER CONFIGURATION', out)
  if (agentError) {
    logger.warn('DATADOG TRACER DIAGNOSTIC', 'Agent Error:', agentError.message)
  }

  config = undefined
  instrumenter = undefined
  samplingRules = undefined
}

function setStartupLogConfig (aConfig) {
  config = aConfig
}

function setStartupLogInstrumenter (theInstrumenter) {
  instrumenter = theInstrumenter
}

function setSamplingRules (theRules) {
  samplingRules = theRules
}

module.exports = {
  startupLog,
  setStartupLogConfig,
  setStartupLogInstrumenter,
  setSamplingRules
}