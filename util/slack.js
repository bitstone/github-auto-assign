const axios = require('axios')
const _ = require('lodash')

const slack = {
  /**
   * Send a Slack message to a github user based on the configuration file
   *
   * @param {Object} cfg
   * @param {String} githubUser
   * @param {String} message
   * @returns {Promise<void>}
   */
  sendMessage: async function (cfg, githubUser, message) {
    let slackHandle = cfg && cfg.slack_user_ids && cfg.slack_user_ids[githubUser]

    if (slackHandle && cfg.slack_channel_hook) {
      slackHandle = '@' + slackHandle.replace(/^@/, '')

      return axios.post(cfg.slack_channel_hook, {
        channel: slackHandle,
        text: `Hey <${slackHandle}>, ${message}`
      })
    }
  },

  /**
   * Send a Slack message to a github user based on the configuration file
   *
   * @param {Object} cfg
   * @param {Object|String} message
   * @param {String} channel Slack channel name
   * @returns {Promise<void>}
   */
  sendChannelMessage: async function (cfg, message, channel = null) {
    if (cfg && cfg.slack_channel_hook) {
      let data = message
      if (_.isString(message)) {
        data = {
          text: message
        }
      }
      if (channel) {
        data.channel = '#' + channel.replace('#', '')
      }

      return axios.post(cfg.slack_channel_hook, data)
    }
  },

  sendMergeFailedMessage: async function (cfg, repo, pushPayload, errorObj, base, head, channel = null) {
    const message = {
      attachments: [
        {
          'fallback': `Failed to perform automatic merge from ${head} into ${base}. Repo: ${repo}. Got exception: ${errorObj.message}`,
          'color': '#a60005',
          'pretext': `<!here> Automatic merge failed! Need to merge manually. Pusher: ${pushPayload.pusher.name}`,
          'fields': [
            {
              'title': 'Merge from:',
              'value': `<${pushPayload.repository.html_url}/tree/${head}|${repo}/${head}>`
            },
            {
              'title': 'Merge into:',
              'value': `<${pushPayload.repository.html_url}/tree/${base}|${repo}/${base}>`
            },
            {
              'title': 'Error: ',
              'value': errorObj.toString()
            }
          ]
        }
      ]
    }
    return this.sendChannelMessage(cfg, message, channel)
  }
}

module.exports = slack
