'use strict'

var React = require('react')
var ReactDOM = require('react-dom')

var Create = React.createClass({
  getInitialState: function() {
    return {
      value: 'Hello!',
    }
  },
  handleChange: function(event) {
    this.setState({
      value: event.target.value,
    })
  },
  render: function() {
    return (
      <input
        type="text"
        value={this.state.value}
        onChange={this.handleChange}
      />
    );
  }
})

ReactDOM.render(<Create/>, document.getElementById('react-create'))
