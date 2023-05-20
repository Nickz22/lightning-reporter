import { LightningElement, api } from "lwc";

export default class BlockRows extends LightningElement {
  @api rows;

  connectedCallback() {
    console.log("blockRows connectedCallback");
  }

  handleRowClick(event) {
    const selectedEvent = new CustomEvent("blockrowclick", {
      detail: event.target.dataset.id,
      bubbles: true
    });
    this.dispatchEvent(selectedEvent);
  }

  handleMouseEnter(event) {
    const selectedEvent = new CustomEvent("blockrowmouseenter", {
      detail: event.target.dataset.id,
      bubbles: true
    });
    this.dispatchEvent(selectedEvent);
  }
}
