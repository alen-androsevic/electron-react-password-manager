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

const PasswordCategoryRow = React.createClass({
  render: function() {
    return (<tr><th colSpan="2">{this.props.category}</th></tr>);
  }
});

const PasswordRow = React.createClass({
  render: function() {
    // TODO: maak dit af, auto hidden van wachtwoord met sterretjes
    // const password = "***"
    return (
      <tr>
        <td>{this.props.password.service}</td>
        <td>{this.props.password.email}</td>
        <td>{this.props.password.password}</td>
      </tr>
    );
  }
});

const TableCreate = React.createClass({
  render: function() {
    var rows = [];
    var lastCategory = null;
    this.props.passwords.forEach(function(password) {
      console.log(password)
      rows.push(<PasswordRow password={password} key={password.id} />);
      lastCategory = password.category;
    });
    return (
      <Table striped bordered condensed hover>
        <thead>
          <tr>
            <th>Service</th>
            <th>Email</th>
            <th>Password</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    );
  }
});

const AddPasswordForm = React.createClass({
  getInitialState() {
    return {
      showModal: false,
      service: '',
      email: '',
      password: ''
    }
  },
  handleServiceChange: function(e){
    this.setState({service: e.target.value})
  },
  handleEmailChange: function(e){
    this.setState({email: e.target.value})
  },
  handlePasswordChange: function(e){
    this.setState({password: e.target.value})
  },
  handleSubmit: function(e) {
    e.preventDefault()
    var post = {
      service: this.state.service,
      email: this.state.email,
      password: this.state.password,
    }
    ipcRenderer.send('addService', post);
  },
  render: function (){
    return (
      <form onSubmit={this.handleSubmit}>
        <FormGroup controlId="formControlsText">
          <ControlLabel>Service</ControlLabel>
          <FormControl onChange={this.handleServiceChange} value={this.state.service} type="text" placeholder="Example: Steam, Google" />
        </FormGroup>
        <FormGroup controlId="formControlsText">
          <ControlLabel>Email address</ControlLabel>
          <FormControl onChange={this.handleEmailChange} value={this.state.email} type="text" placeholder="Enter email/username" />
        </FormGroup>
        <FormGroup controlId="formControlsPassword">
          <ControlLabel>Password</ControlLabel>
          <FormControl onChange={this.handlePasswordChange} value={this.state.password} type="password" />
        </FormGroup>
        <Button type="submit">
          Add Password
        </Button>
      </form>
    )
  }
})

const AddPasswordButton = React.createClass({
  render: function (){
    return (
      <div>
        <Button onClick={this.open} type="submit">
          Add Password
        </Button>

        <Modal id="createPasswordModal" show={this.state.showModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title>Modal heading</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h4>Add a Password</h4>
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
    return { showModal: false };
  },

  close() {
    this.setState({ showModal: false });
  },

  open() {
    this.setState({ showModal: true });
  },
})

const PasswordTable = React.createClass({
  render: function() {
    return (
      <div>
        <h1>Password App</h1>
        <AddPasswordButton />
        <TableCreate passwords={this.props.passwords} />
      </div>
    )
  }
})

// When we receive server data
ipcRenderer.on('indexRender', function(event, passwords) {
  console.log(passwords)
  ReactDOM.render(
    <PasswordTable passwords={passwords} />,
    document.getElementById('react-index')
  )
})

// Send a request to get server data
ipcRenderer.send('indexRender')
