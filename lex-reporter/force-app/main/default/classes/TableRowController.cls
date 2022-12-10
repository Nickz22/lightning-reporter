public with sharing class TableRowController {
    
    @AuraEnabled
    public static Note saveNote(String content, String parentId){
        Note newNote = new Note(Body=content,IsPrivate=false,ParentId=parentId,Title='LEX Reporter Note');
        insert newNote;
        return [SELECT CreatedDate,CreatedBy.Name,CreatedBy.FullPhotoUrl,Body 
                  FROM Note 
                  WHERE Id=:newNote.Id 
                  LIMIT 1];
    }
}
