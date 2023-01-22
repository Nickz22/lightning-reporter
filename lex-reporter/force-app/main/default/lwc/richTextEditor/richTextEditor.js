import { LightningElement, track, api } from 'lwc';
import fetchUsers from '@salesforce/apex/TableRowController.fetchUsers';

export default class RichTextEditor extends LightningElement {

    @track users = [];
    @api placeholder;
    @api disabledCategories;
    isUserSearching = false;

    renderedCallback(){
        this.template.querySelectorAll('lightning-input-rich-text')[0].focus();
    }

    handleKeyUp(event){
        // if key press is escape
        if(event.keyCode === 27){
            if(this.users.length > 0){
                this.users = [];
            }else{
                // bubble key up only after we've closed user list
                this.dispatchEvent(new CustomEvent('rtekeyup', {
                    bubbles: true,
                    detail: event.keyCode
                }));
            }   
            this.isUserSearching = false;
        }
        // if key press is @
        if(event.key === '@' && !this.isUserSearching){
            this.fetchUsers(event);
            this.isUserSearching = true;
        }else if(event.key !== '@' && event.keyCode !== 13 && this.isUserSearching){ // if key press is not @ or enter
            try {
                // loop through event.target child nodes and log their innerText
                for(let i = 0; i < event.target.childNodes.length; i++){
                    console.log(`value from child node ${i} : ${event.target.childNodes[i].innerText}`);
                }
                    
                // find substring between last "@" and last "</p>"
                let lastAt = event.target.value.lastIndexOf('@');
                let lastP = event.target.value.lastIndexOf('</p>');
                let substring = event.target.value.substring(lastAt+1, lastP);
                // filter users by name
                for(let user of this.users){
                    if(!substring){
                        user.hidden = false;
                    }
                    if(!user.Name.toLowerCase().includes(substring.toLowerCase())){
                        user.hidden = true;
                    }else{
                        user.hidden = false;
                    }
                }   
            } catch (error) {
                console.error(error.message);
            }
        }
    }

    handleKeyDown(event) {

        // when down arrow pressed
        if(event.keyCode === 40){
            let users = this.template.querySelectorAll('.lookup-user');
            if(users.length > 0){
                users[0].focus();
            }
        }

        if(event.metaKey && event.keyCode === 13){
            // emit event with 'saved' as detail
            this.dispatchEvent(new CustomEvent('save', {
                bubbles: true,
                detail: event.target.value
            }));
        }

        if(event.keyCode === 13 && this.isUserSearching){
            let users = this.template.querySelectorAll('.lookup-user');
            if(users.length === 1){
                this.selectLookupUser(users[0].textContent)
            }
        }
    }

    handleUserSelect(event){
        this.dispatchEvent(new CustomEvent('userselect', {
            bubbles: true,
            detail: event.target.childNodes[1].textContent
        }));

        this.selectLookupUser(event.target.childNodes[1].textContent);
    }

    selectLookupUser(userName){
        let rte = this.template.querySelectorAll('lightning-input-rich-text')[0];
        let lastAt = rte.value.lastIndexOf('@');
        let lastP = rte.value.lastIndexOf('</p>');
        let substring = rte.value.substring(lastAt+1, lastP);
        let range = rte.value.lastIndexOf(substring);

        let firstMsgSegment = rte.value.substring(0, range).replace("</p>", "");
        let secondMsgSegment = rte.value.substring(range+substring.length);

        rte.value = `${firstMsgSegment}<strong>${userName}</strong>${secondMsgSegment}`;
        rte.setRangeText('', rte.value.length, rte.value.length, 'end');
        rte.setFormat({bold: false});
        this.isUserSearching = false;
        this.users = [];
    }

    fetchUsers(){
        fetchUsers()
            .then(result => {
                for(let i = 0; i < result.length; i++){
                    this.users.push({
                        ...result[i],
                        hidden: false
                    });
                }
            })
            .catch(error => {
                this.showNotification('Error', error.body.message, 'error');
            });
    }

    handleUserKeyUp(event){
        // if key press is down
        if(event.keyCode === 40){
            event.target.nextSibling.focus();
        }
        // if key press is up
        if(event.keyCode === 38){
            event.target.previousSibling.focus();
        }
        // if key press is enter
        if(event.keyCode === 13){
            this.users = [];
            this.handleUserSelect(event);
        }
        // if key press is escape
        if(event.keyCode === 27){
            this.users = [];
        }
    }

}