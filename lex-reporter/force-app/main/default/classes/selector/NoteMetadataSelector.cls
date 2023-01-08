public with sharing class NoteMetadataSelector {
    public NoteMetadataSelector() {}

    public List<Note_Metadata__c> selectByNoteParentIds(Set<String> parentIds){
        List<Note_Metadata__c> noteMd = [SELECT Note_Parent_Id__c, Note_Id__c, Viewed_By__r.FullPhotoUrl,
                                                Mentioned_User__c, Type__c, Viewed_By__r.Name, Mentioned_User__r.Name
                                        FROM Note_Metadata__c
                                        WHERE Note_Parent_Id__c IN :parentIds];
        return SecurityUtil.sanitizeQueryResult(noteMd);
    }

    public List<Note_Metadata__c> selectByContextIdAndViewedOrMentionedByCurrentUser(Id contextRecordId){
        List<Note_Metadata__c> noteMd = [SELECT Note_Id__c,Mentioned_User__c,Mentioned_User__r.Name,
                                                Viewed_By__c,Viewed_By__r.Name,Type__c
                                            FROM Note_Metadata__c
                                            WHERE Reporter_Context_Record_Id__c = :contextRecordId
                                            AND (Viewed_By__c =: UserInfo.getUserId() OR Mentioned_User__c =: UserInfo.getUserId())
                                        ORDER BY CreatedDate DESC];
        return SecurityUtil.sanitizeQueryResult(noteMd);
    }
}
