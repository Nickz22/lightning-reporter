public with sharing class NoteSelector {
    public NoteSelector() {}

    public List<Note> selectByIds(Set<Id> ids) {
        List<Note> notes = [SELECT Id, Body, CreatedBy.Name, ParentId,CreatedBy.FullPhotoUrl, CreatedDate 
                              FROM Note 
                              WHERE Id IN :ids];
        return SecurityUtil.sanitizeQueryResult(notes);
    }
}
