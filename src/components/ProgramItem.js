import React, { Component } from "react";
import { ProgramSelection } from "../ProgramSelection";
import Location from "./Location";
import Tag from "./Tag";
import Participant from "./Participant";
import configData from "../config.json";
//import PropTypes from 'prop-types'

class ProgramItem extends Component {
  state = {
    expanded: false,
    selected: false,
  };
  constructor(props) {
    super(props);
    //this.addActiveClass = this.addActiveClass.bind(this);
    this.state = {
      expanded: false,
      selected: ProgramSelection.getSelection(this.props.item.id),
    };
    this.handleChange = this.handleChange.bind(this);
  }
  toggleDetails() {
    let currentState = this.state;
    currentState.expanded = !currentState.expanded;
    this.setState({ currentState });
    // this.setState(prevState => ({
    //     expanded: !prevState.expanded
    // }));
    // alert(e.target.parent);
  }

  handleChange({ target }) {
    let currentState = this.state;
    currentState.selected = target.checked;
    this.setState({ currentState });
    ProgramSelection.setSelection(this.props.item.id, target.checked);
    this.props.handler();
  }

  render() {
    let id = "item_" + this.props.item.id;
    const locations = [];
    if (Array.isArray(this.props.item.loc))
      for (let loc of this.props.item.loc) {
        locations.push(<Location key={loc} loc={loc} />);
      }
    else
      locations.push(
        <Location key={this.props.item.loc} loc={this.props.item.loc} />
      );

    const tags = [];
    for (let tag of this.props.item.tags) {
      tags.push(<Tag key={tag} tag={tag} />);
    }
    // console.log(this.props.item.people);
    const people = [];
    if (this.props.item.people) {
      this.props.item.people.forEach((person) => {
        people.push(<Participant key={person.id} person={person} />);
      });
    }
    const meetingLink =
      this.props.item.links &&
      this.props.item.links.meeting &&
      this.props.item.links.meeting.length ? (
        <div className="item-links-meeting">
          <a href={this.props.item.links.meeting}>{configData.LINKS.MEETING}</a>
        </div>
      ) : (
        ""
      );
    const recordingLink =
      this.props.item.links &&
      this.props.item.links.recording &&
      this.props.item.links.recording.length ? (
        <div className="item-links-recording">
          <a href={this.props.item.links.recording}>
            {configData.LINKS.RECORDING}
          </a>
        </div>
      ) : (
        ""
      );

    return (
      <div id={id} className="item">
        <div className="item-selection">
          <div className="selection">
            <input
              type="checkbox"
              className="selection-control"
              checked={this.state.selected}
              onChange={this.handleChange}
              onClick={this.handleChange}
            />
          </div>
        </div>
        <div className="item-entry" onClick={this.toggleDetails.bind(this)}>
          <div className="item-title">{this.props.item.title}</div>
          <div className="item-location">{locations}</div>
          <div
            className={
              this.state.expanded
                ? "item-details item-details-expanded"
                : "item-details"
            }
          >
            <div className="item-people">
              <ul>{people}</ul>
            </div>
            <div className="item-tags">{tags}</div>
            <div
              className="item-description"
              dangerouslySetInnerHTML={{ __html: this.props.item.desc }}
            />
            <div className="item-links">
              {meetingLink}
              {recordingLink}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// ProgramItem.PropTypes = {
//     item: PropTypes.object
// }

export default ProgramItem;
