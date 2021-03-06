class Member extends Backbone.Model
  constructor: (@buffer, attrs) ->
    super(attrs)
    
class ChannelBuffer extends Buffer
  constructor: (connection, attrs) ->
    super(connection, attrs)
    @members = new MemberList()
    @members.on 'reset', (col, opts) ->
      _.each opts.previousModels, (model) ->
        model.trigger 'destroy'

  join: ->
    @connection.join(@get('name'))

  part: ->
    @connection.part(@get('name'))

  isActive: ->
    super and @get('joined')

  reload: (attrs) ->
    super
    @set('joined', attrs.joined)

  clientDisconnected: ->
    super
    @set('joined', false)

  messageHandlers:
    channel_init: (message) ->
      if message.topic?
        @set('topic', message.topic)
      @members.reset()
      for memberAttrs in message.members
        @members.add(new Member(this, memberAttrs))
      @set('joined', true)

  initializedMessageHandlers:
    channel_topic: (message) ->
      @set('topic', message.topic)

    joined_channel: (message) ->
      @members.add(new Member(this, message))

    parted_channel: (message) ->
      @members.removeByNick(message.nick)

    quit: (message) ->
      if message.nick?
        @members.removeByNick(message.nick)

    kicked_channel: (message) ->
      @members.removeByNick(message.nick)

    you_joined_channel: (message) ->
      @set('joined', true)

    you_parted_channel: (message) ->
      @set('joined', false)

    nickchange: (message) ->
      @members.updateNick(message)

    you_nickchange: (message) ->
      @members.updateNick(message)

    socket_closed: (message) ->
      @members.reset();
      @set('joined', false)

window.ChannelBuffer = ChannelBuffer