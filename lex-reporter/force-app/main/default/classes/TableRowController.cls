public with sharing class TableRowController {
    
    /**
     * @param content - Note body
     * @param parentId - immediate parent of the Note
     * @param topMostId - `recordId` context of the Lex Reporter when this Note was saved 
     * @return  `Note`
     */
    @AuraEnabled
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
            List<Lightning_Reporter_Note_Metadata__c> noteMd = getMentions(userFullNames, newNote, parentId, topMostId);
            for(Lightning_Reporter_Note_Metadata__c md : noteMd){
                mentionedUserIds.add(md.Mentioned_User__c);
            }
            insert noteMd;

            if(!mentionedUserIds.isEmpty()){
                CustomNotificationType notificationType = [SELECT Id, DeveloperName FROM CustomNotificationType WHERE DeveloperName='Lex_Reporter_Notification'];
            
                Messaging.CustomNotification notification = new Messaging.CustomNotification();

                notification.setTitle('From '+UserInfo.getUserName());
                notification.setBody('Click to go to record');

                notification.setNotificationTypeId(notificationType.Id);
                notification.setTargetId(topMostId);
                
                notification.send(mentionedUserIds);
            }   

            n = [SELECT CreatedDate,CreatedBy.Name,
                        CreatedBy.FullPhotoUrl,Body,ParentId
                   FROM Note 
                  WHERE Id=:newNote.Id 
                  ORDER BY CreatedDate asc
                  LIMIT 1];   
        } catch (Exception e) {
            throwAuraException(e);
        }
        return n;
    }

    @AuraEnabled
    public static void countView(DTO.NoteMetadataDTO noteMetadata){
        try {
            upsert noteMetadata.convertToDbModel() Lightning_Reporter_Note_Metadata__c.Unique_Id__c;
        } catch (Exception e) {
            throwAuraException(e);
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<User> fetchUsers(){
        List<User> users;
        try {
            users = [SELECT Name,FullPhotoUrl FROM User];
        } catch (Exception e) {
            throwAuraException(e);
        }

        return users;
    }

    // helpers
    private static List<Lightning_Reporter_Note_Metadata__c> getMentions(Set<String> userFullNames, Note newNote, String parentId, String topMostId){
        List<Lightning_Reporter_Note_Metadata__c> mentionedUserMd = new List<Lightning_Reporter_Note_Metadata__c>();
        for(User u : [SELECT Id FROM User WHERE Name IN: userFullNames]){
            mentionedUserMd.add(
                new Lightning_Reporter_Note_Metadata__c(
                    Note_Id__c=newNote.Id,
                    Note_Parent_Id__c=parentId,
                    Mentioned_User__c=u.Id,
                    Reporter_Context_Record_Id__c=topMostId,
                    Type__c='Mention'
            ));
        }
        return mentionedUserMd;
    }

    private static void throwAuraException(Exception e){
        AuraHandledException ae = new AuraHandledException(e.getMessage() + '['+e.getStackTraceString()+']');
        ae.setMessage(e.getMessage() + '['+e.getStackTraceString()+']');
        throw ae;
    }
}
