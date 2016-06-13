'use strict'

const React                 = require('react')
const ReactDOM              = require('react-dom')
const Button                = require('react-bootstrap').Button
const Popover               = require('react-bootstrap').Popover
const Tooltip               = require('react-bootstrap').Tooltip
const Modal                 = require('react-bootstrap').Modal
const OverlayTrigger        = require('react-bootstrap').OverlayTrigger
const FormGroup             = require('react-bootstrap').FormGroup
const ControlLabel          = require('react-bootstrap').ControlLabel
const FormControl           = require('react-bootstrap').FormControl

const CreateAccount = React.createClass({
  getInitialState: function() {
    return {
      passwordone: '',
      passwordtwo: '',
      encryption:  '256',
      hashing:     '3',
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
        iterations: 800000,
      }
    }

    if (this.state.hashing == 2) {
      var pbkd2f = {
        iterations: 1000000,
      }
    }

    if (this.state.hashing == 3) {
      var pbkd2f = {
        iterations: 1500000,
      }
    }

    if (this.state.hashing == 4) {
      var pbkd2f = {
        iterations: 2500000,
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
             <option value='128'>Secure - 1024bits</option>
             <option selected value='256'>Heavily Secured - 2048bits (recommended)</option>
           </FormControl>
         </FormGroup>

         <FormGroup controlId='formControlsSelect'>
          <ControlLabel>Hashing Strength</ControlLabel>
          <FormControl onChange={this.handleHashingChange} value={this.state.value} componentClass="select" placeholder="select">
            <option value='1'>Light - 800k Iterations</option>
            <option value='2'>Medium - 1m Iterations</option>
            <option selected value='3'>Strong - 1.5m Iterations (recommended)</option>
            <option value='4'>Impossible - 2.5m Iterations</option>
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
