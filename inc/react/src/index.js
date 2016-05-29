'use strict'

const React    = require('react')
const ReactDOM = require('react-dom')

var PasswordCategoryRow = React.createClass({
  render: function() {
    return (<tr><th colSpan="2">{this.props.category}</th></tr>);
  }
});

var PasswordRow = React.createClass({
  render: function() {
    var name = this.props.password.stocked ?
      this.props.password.name :
      <span style={{color: 'red'}}>
        {this.props.password.name}
      </span>;
    return (
      <tr>
        <td>{name}</td>
        <td>{this.props.password.price}</td>
      </tr>
    );
  }
});

var PasswordTable = React.createClass({
  render: function() {
    var rows = [];
    var lastCategory = null;
    this.props.passwords.forEach(function(password) {
      if (password.category !== lastCategory) {
        rows.push(<PasswordCategoryRow category={password.category} key={password.category} />);
      }
      rows.push(<PasswordRow password={password} key={password.name} />);
      lastCategory = password.category;
    });
    return (
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  }
});

var SearchBar = React.createClass({
  render: function() {
    return (
      <form>
        <input type="text" placeholder="Search..." />
        <p>
          <input type="checkbox" />
          {' '}
          Only show passwords in stock
        </p>
      </form>
    )
  }
})

var FilterablePasswordTable = React.createClass({
  render: function() {
    return (
      <div>
        <SearchBar />
        <PasswordTable passwords={this.props.passwords} />
      </div>
    )
  }
})
ipcRenderer.send('indexRender')
ipcRenderer.on('indexRender', function(event, passwords) {
  console.log("server response!")
  ReactDOM.render(
    <FilterablePasswordTable passwords={passwords} />,
    document.getElementById('react-index')
  )
})
