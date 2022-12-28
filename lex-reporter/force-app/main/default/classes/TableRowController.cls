public with sharing class TableRowController {
    
    @AuraEnabled
    /**
     * 
     * @param content - Note body
     * @param parentId - immediate parent of the Note
     * @param topMostId - `recordId` context of the Lex Reporter when this Note was saved 
     * @return  `Note`
     */
    public static Note saveNote(String content, String parentId, String topMostId){

        Note n;
        try {
            // insert note in db
            Note newNote = new Note(
                Body=content,
                IsPrivate=false,
                ParentId=parentId,
                Title='LEX Reporter Note'
            );
            insert newNote;

            // send notifications to mentioned users
            List<String> messageSegmentedByMention = content.split('@');
            Set<String> userFullNames = new Set<String>();
            for(String s : messageSegmentedByMention){
                if(s.startsWith('<strong>')){
                    userFullNames.add(s.substring(8,s.indexOf('</strong>')));
                }
            }
            
            Set<String> mentionedUserIds = new Set<String>();
            List<Lightning_Reporter_Note_Metadata__c> mentionedUserMd = new List<Lightning_Reporter_Note_Metadata__c>();
            for(User u : [SELECT Id FROM User WHERE Name IN: userFullNames]){
                mentionedUserIds.add(u.Id);
                mentionedUserMd.add(
                    new Lightning_Reporter_Note_Metadata__c(
                        Note_Id__c=newNote.Id,
                        Note_Parent_Id__c=parentId,
                        Mentioned_User__c=u.Id,
                        Type__c='Mention'
                ));
            }
            insert mentionedUserMd;

            // Get the Id for our custom notification type
            CustomNotificationType notificationType = 
                [SELECT Id, DeveloperName 
                FROM CustomNotificationType 
                WHERE DeveloperName='Lex_Reporter_Notification'];
            
            // Create a new custom notification
            Messaging.CustomNotification notification = new Messaging.CustomNotification();

            // Set the contents for the notification
            notification.setTitle('From '+UserInfo.getUserName());
            notification.setBody('Click to go to note');

            // Set the notification type and target
            notification.setNotificationTypeId(notificationType.Id);
            notification.setTargetId(topMostId);
            
            // Actually send the notification
            notification.send(mentionedUserIds);

            n = [SELECT CreatedDate,CreatedBy.Name,CreatedBy.FullPhotoUrl,Body 
                    FROM Note 
                    WHERE Id=:newNote.Id 
                    ORDER BY CreatedDate asc
                    LIMIT 1];   
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return n;
    }

    @AuraEnabled
    public static void countView(NoteMetadataDTO noteMetadata){
        try {
            upsert noteMetadata.convertToDbModel() Lightning_Reporter_Note_Metadata__c.Unique_Id__c;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<User> fetchUsers(){
        try {
            return [SELECT Name,FullPhotoUrl FROM User];
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
            noteMetadata.Type__c = 'View';
            return noteMetadata;
        }
    }
}
