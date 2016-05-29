'use strict'

const React    = require('react')
const ReactDOM = require('react-dom')

const Create = React.createClass({
  getInitialState: function() {
    return {
      passwordone: '',
      passwordtwo: '',
    }
  },
  handlePassOneChange: function(e) {
    this.setState({passwordone: e.target.value})
  },
  handlePassTwoChange: function(e) {
    this.setState({passwordtwo: e.target.value})
  },
  handleSubmit: function(e) {
    e.preventDefault()

    // TODO: make the bits and pbkd2f iterations and count dynamic
    ipcRenderer.send('login', {
      pass: this.state.passwordone,
      pass2: this.state.passwordtwo,
      bits: 512,
      pbkd2f: {
        iterations: 1,
        count: 1
      }
    })
    this.setState({passwordtwo: '', passwordone: ''})
  },
  render: function() {
    return (
      <form className="createForm" onSubmit={this.handleSubmit}>
        <input
          type="text"
          placeholder="Your Password"
          value={this.state.passwordone}
          onChange={this.handlePassOneChange}
        />
        <input
          type="text"
          placeholder="Password Again"
          value={this.state.passwordtwo}
          onChange={this.handlePassTwoChange}
        />
        <br/>
        <input type="submit" value="Post" />
      </form>
    );
  }
})

ReactDOM.render(<Create/>, document.getElementById('react-create'))
