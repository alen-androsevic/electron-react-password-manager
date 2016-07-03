'use strict'

const React          = require('react')
const ReactDOM       = require('react-dom')
const Button         = require('react-bootstrap').Button
const Popover        = require('react-bootstrap').Popover
const Tooltip        = require('react-bootstrap').Tooltip
const Modal          = require('react-bootstrap').Modal
const OverlayTrigger = require('react-bootstrap').OverlayTrigger
const FormGroup      = require('react-bootstrap').FormGroup
const ControlLabel   = require('react-bootstrap').ControlLabel
const FormControl    = require('react-bootstrap').FormControl

let encryption

const LoginAccount = React.createClass({
  getInitialState: function() {
    return {
      password: '',
      disabled: false,
    }
  },

  handlePassChange: function(e) {
    this.setState({password: e.target.value})
  },

  handleSubmit: function(e) {
    e.preventDefault()

    ipcRenderer.send('login', {
      pass:   this.state.password,
      bits:   encryption.bits,
      pbkd2f: encryption.pbkd2f,
    })

    this.setState({disabled: 'disabled'})
    setTimeout(function(that) {
      that.setState({password: '', disabled: false})
    }, 5000, this)
  },

  render: function() {
    var opts = {}
    if (this.state.disabled) {
      opts['disabled'] = true
    }

    return (
      <form onSubmit={this.handleSubmit}>
        <h2>Please log in</h2>
        <FormGroup controlId='formControlsPassword'>
          <ControlLabel>Password</ControlLabel>
          <FormControl {...opts} onChange={this.handlePassChange} value={this.state.password} type='password' />
        </FormGroup>
        <Button {...opts} type='submit'>
          Login
        </Button>
      </form>
    )
  },
})

ipcRenderer.send('requestEncryption')
ipcRenderer.on('requestEncryption', function(event, enc) {
  encryption = enc
  ReactDOM.render(<LoginAccount/>, document.getElementById('react-login'))
})
