public class NoteMetadataDTO{
    @AuraEnabled public String NoteId {get;set;}
    @AuraEnabled public String NoteParentId {get;set;}
    @AuraEnabled public String TopMostId {get;set;}
    @AuraEnabled public String ViewedById {get;set;}

    public Note_Metadata__c convertToDbModel(){
        Note_Metadata__c noteMetadata = new Note_Metadata__c();
        noteMetadata.Note_Id__c = this.NoteId;
        noteMetadata.Note_Parent_Id__c = this.NoteParentId;
        noteMetadata.Reporter_Context_Record_Id__c = this.TopMostId;
        noteMetadata.Viewed_By__c = (Id) this.ViewedById;
        noteMetadata.Unique_Id__c = this.NoteId + this.ViewedById;
        noteMetadata.Type__c = 'View';
        return noteMetadata;
    }
}