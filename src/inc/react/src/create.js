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

const CreateAccount = React.createClass({
  getInitialState: function() {
    return {
      passwordone: '',
      passwordtwo: '',
      encryption:  '512',
      hashing:     '1',
    }
  },

  handlePassOneChange: function(e) {
    this.setState({passwordone: e.target.value})
  },

  handlePassTwoChange: function(e) {
    this.setState({passwordtwo: e.target.value})
  },

  handleEncryptionChange: function(e) {
    this.setState({passwordtwo: e.target.value})
  },

  handleEncryptionChange: function(e) {
    this.setState({encryption: e.target.value})
  },

  handleHashingChange: function(e) {
    this.setState({hashing: e.target.value})
  },

  handleSubmit: function(e) {
    e.preventDefault()

    if (this.state.hashing == 1) {
      var pbkd2f = {
        iterations: 100000,
        count:      128,
      }
    }

    if (this.state.hashing == 2) {
      var pbkd2f = {
        iterations: 200000,
        count:      256,
      }
    }

    if (this.state.hashing == 3) {
      var pbkd2f = {
        iterations: 300000,
        count:      512,
      }
    }

    if (this.state.hashing == 4) {
      var pbkd2f = {
        iterations: 400000,
        count:      1024,
      }
    }

    ipcRenderer.send('login', {
      pass:   this.state.passwordone,
      pass2:  this.state.passwordtwo,
      bits:   this.state.encryption,
      pbkd2f: pbkd2f,
    })
    this.setState({passwordtwo: '', passwordone: ''})
  },

  render: function() {
    return (
      <form onSubmit={this.handleSubmit}>
        <h2>Welcome! Please create a master password</h2>
        <FormGroup controlId='formControlsPassword'>
          <ControlLabel>Password</ControlLabel>
          <FormControl onChange={this.handlePassOneChange} value={this.state.passwordone} type='password' />
        </FormGroup>
          <FormGroup controlId='formControlsPassword'>
            <ControlLabel>Password Again</ControlLabel>
            <FormControl onChange={this.handlePassTwoChange} value={this.state.passwordtwo} type='password' />
          </FormGroup>

          <FormGroup controlId='formControlsSelect'>
           <ControlLabel>Encryption Strength</ControlLabel>
           <FormControl onChange={this.handleEncryptionChange} value={this.state.value} componentClass='select' placeholder='select'>
             <option value='512'>Light - 512bits</option>
             <option value='1024'>Medium - 1024bits</option>
             <option value='2048'>Strong - 2048bits</option>
             <option value='4096'>Impossible - 4096bits</option>
           </FormControl>
         </FormGroup>

         <FormGroup controlId='formControlsSelect'>
          <ControlLabel>Hashing Strength</ControlLabel>
          <FormControl onChange={this.handleHashingChange} value={this.state.value} componentClass="select" placeholder="select">
            <option value='1'>Light - 100k times 128bits</option>
            <option value='2'>Medium - 200k times 256bits</option>
            <option value='3'>Strong - 300k times 512bits</option>
            <option value='4'>Impossible - 400k times 1024bits</option>
          </FormControl>
        </FormGroup>
        <Button type='submit'>
          Create Account
        </Button>
      </form>
    )
  },
})

ReactDOM.render(<CreateAccount/>, document.getElementById('react-create'))
