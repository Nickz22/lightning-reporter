public class NoteDTO{
    @AuraEnabled public Note note {get; set;}
    @AuraEnabled public Long localCreatedDate {get; set;}
    @AuraEnabled public String parentSObjectType {get; set;}
    @AuraEnabled public List<Note_Metadata__c> views = new List<Note_Metadata__c>();
    @AuraEnabled public Boolean alertRunningUser {get; set;}

    public NoteDTO(Note note, List<Note_Metadata__c> metadata){
        this.note = note;
        this.localCreatedDate = Datetime.parse(note.CreatedDate.format()).getTime(); // convert created date to local timezone
        this.parentSObjectType = note.ParentId.getSObjectType().getDescribe().getName();
        Set<Id> mentionedUserIds = new Set<Id>();
        Set<Id> viewedByUserIds = new Set<Id>();
        for(Note_Metadata__c md : metadata){
            if(md.Viewed_By__c != null){ // we only need views for FE
                views.add(md);
            }
        }
    }
}