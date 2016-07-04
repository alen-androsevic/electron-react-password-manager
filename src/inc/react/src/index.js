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
const Table          = require('react-bootstrap').Table
const ProgressBar    = require('react-progressbar')

// Each table row
const PasswordRow = React.createClass({
  render: function() {
    // TODO: maak dit af, auto hidden van wachtwoord met sterretjes
    // const password = '***'
    return (
      <tr>
        <td>{this.props.password.service}</td>
        <td>{this.props.password.email}</td>
        <td>{this.props.password.password}</td>
        <td></td>
      </tr>
    )
  },
})

// How the table is created
const TableCreate = React.createClass({
  handleRowRemove: function(password) {
    var index = -1
    var clength = this.props.passwords.length
    for (var i = 0;i < clength; i++) {
      if (this.props.passwords[i].id === password.id) {
        index = i
        break
      }
    }

    this.props.passwords.splice(index, 1)
  },

  render: function() {
    var rows = []
    var lastCategory = null
    this.props.passwords.forEach(function(password) {
      rows.push(<PasswordRow password={password} key={password.id} />)
      lastCategory = password.category
    })

    return (
      <Table striped bordered condensed hover responsive>
        <thead>
          <tr>
            <th>Service</th>
            <th>Email</th>
            <th>Password</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    )
  },
})

// The add password form
const AddPasswordForm = React.createClass({
  getInitialState() {
    return {
      showModal: false,
      service:   '',
      email:     '',
      password:  '',
    }
  },

  handleServiceChange: function(e) {
    this.setState({service: e.target.value})
  },

  handleEmailChange: function(e) {
    this.setState({email: e.target.value})
  },

  handlePasswordChange: function(e) {
    this.setState({password: e.target.value})
  },

  handleSubmit: function(e) {
    e.preventDefault()

    if (this.state.service.length === 0 || this.state.email.length === 0 || this.state.password.length === 0) {
      alerter({
        title: 'Error',
        text: 'All fields must be populated',
      }, ['warning'])
      return
    }

    var post = {
      service:  this.state.service,
      email:    this.state.email,
      password: this.state.password,
    }
    ipcRenderer.send('addService', post)
  },

  render: function() {
    var phservice = 'Example: Steam, Google'
    var phemail = 'Enter email/username'

    return (
      <form onSubmit={this.handleSubmit}>
        <FormGroup controlId='formControlsText'>
          <ControlLabel>Service</ControlLabel>
          <FormControl onChange={this.handleServiceChange} value={this.state.service} type='text' placeholder={phservice} />
        </FormGroup>
        <FormGroup controlId='formControlsText'>
          <ControlLabel>Email address</ControlLabel>
          <FormControl onChange={this.handleEmailChange} value={this.state.email} type='text' placeholder={phemail} />
        </FormGroup>
        <FormGroup controlId='formControlsPassword'>
          <ControlLabel>Password</ControlLabel>
          <FormControl onChange={this.handlePasswordChange} value={this.state.password} type='password' />
        </FormGroup>
        <Button type='submit'>
          Add Password
        </Button>
      </form>
    )
  },
})

// The encrypt button
const EncryptButton = React.createClass({
  getInitialState() {
    return {
      encrypted: this.props.encryptState,
    }
  },

  render: function() {
    var divStyle = {
      display: 'inline',
    }
    var styleEncrypt = {}
    var styleDecrypt = {}
    if (this.state.encrypted === 0) {
      styleDecrypt = {
        display: 'none',
      }
    } else {
      styleEncrypt = {
        display: 'none',
      }
    }

    return (
      <div style={divStyle}>
        <Button bsStyle='success' style={styleEncrypt} onClick={this.encrypt} type='submit'>
          Encrypt Folder
        </Button>
        <Button bsStyle='warning' style={styleDecrypt} onClick={this.decrypt} type='submit'>
          Decrypt Folder
        </Button>
      </div>
    )
  },

  encrypt() {
    ipcRenderer.send('encryptFolder')
    this.setState({ encrypted: 1 })
  },

  decrypt() {
    ipcRenderer.send('decryptFolder')
    this.setState({ encrypted: 0 })
  },
})


const LoadingBar = React.createClass({
  render: function() {
    return (
      <div>
        <ProgressBar completed={0} />
      </div>
    )
  },

})

const LogoutButton = React.createClass({
  render: function() {
    var divStyle = {
      display: 'inline',
    }
    return (
      <div style={divStyle}>
        <Button bsStyle='danger' className='pull-right' onClick={this.logout} type='submit'>
          Logout
        </Button>
      </div>
    )
  },

  logout() {
    alerter({
      title: 'Logging out',
      text: 'Are you sure you want to logout?',
      confirmButtonText: 'Logout',
    }, ['warning', 'confirm', 'red'], function() {
      ipcRenderer.send('logout')
    })
  },
})

// The add password button
const AddPasswordButton = React.createClass({
  render: function() {
    var divStyle = {
      display: 'inline',
    }
    return (
      <div style={divStyle}>
        <Button bsStyle='success' onClick={this.open} type='submit'>
          Add Password
        </Button>

        <Modal id='createPasswordModal' show={this.state.showModal} onHide={this.close}>
          <Modal.Header>
            <Modal.Title>Add a service</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <AddPasswordForm/>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.close}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    )
  },

  getInitialState() {
    return { showModal: false }
  },

  close() {
    this.setState({ showModal: false })
  },

  open() {
    this.setState({ showModal: true })
  },
})


// Our main view
const Main = React.createClass({
  render: function() {
    var divStyle = {
      display: 'inline',
    }

    return (
      <div>
        <LoadingBar />
        <AddPasswordButton /> <EncryptButton encryptState={this.props.encryptState} /> <LogoutButton />
        <TableCreate passwords={this.props.passwords} />
      </div>
    )
  },
})

// When we receive server data
ipcRenderer.on('indexRender', function(event, passwords, encryptState, title) {
  ReactDOM.render(
    <Main title={title} passwords={passwords} encryptState={encryptState} />,
    document.getElementById('react-index')
  )
})

// Send a request to get server data
ipcRenderer.send('indexRender')
