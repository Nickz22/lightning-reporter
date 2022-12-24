public with sharing class TableRowController {
    
    @AuraEnabled
    public static Note saveNote(String content, String parentId){
        Note newNote = new Note(Body=content,IsPrivate=false,ParentId=parentId,Title='LEX Reporter Note');
        insert newNote;
        return [SELECT CreatedDate,CreatedBy.Name,CreatedBy.FullPhotoUrl,Body 
                  FROM Note 
                  WHERE Id=:newNote.Id 
                  ORDER BY CreatedDate asc
                  LIMIT 1];
    }

    @AuraEnabled
    public static void saveNoteMetadata(NoteMetadataDTO noteMetadata){
        try {
            upsert noteMetadata.convertToDbModel() Lightning_Reporter_Note_Metadata__c.Unique_Id__c;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    public class NoteMetadataDTO{
        @AuraEnabled public String NoteId {get;set;}
        @AuraEnabled public String NoteParentId {get;set;}
        @AuraEnabled public String ViewedById {get;set;}

        public Lightning_Reporter_Note_Metadata__c convertToDbModel(){
            Lightning_Reporter_Note_Metadata__c noteMetadata = new Lightning_Reporter_Note_Metadata__c();
            noteMetadata.Note_Id__c = this.NoteId;
            noteMetadata.Note_Parent_Id__c = this.NoteParentId;
            noteMetadata.Viewed_By__c = (Id) this.ViewedById;
            noteMetadata.Unique_Id__c = this.NoteId + this.ViewedById;
            return noteMetadata;
        }
    }
}
