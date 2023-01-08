public with sharing class DTO {
    
    public class ContextDTO {

        @AuraEnabled public List<SubjectDTO> subjects {get; set;}
        @AuraEnabled public List<NoteDTO> alerts {get; set;} 

        public ContextDTO(List<SubjectDTO> subjects, List<NoteDTO> alerts){
            this.subjects = subjects.isEmpty() ? new List<SubjectDTO>() : subjects;
            this.alerts = alerts;
        }
    }

    public class FieldDTO{
        @AuraEnabled public String name {get; set;}
        @AuraEnabled public String label {get; set;}
        @AuraEnabled public String type {get; set;}
        @AuraEnabled public Boolean isUpdateable {get; set;}
        @AuraEnabled public Boolean defaultSelected {get; set;}
        @AuraEnabled public Boolean isCustom {get; set;}

        public FieldDTO(String name, String label, String type, Boolean isUpdateable, Boolean defaultSelected, Boolean isCustom){
            this.name = name;
            this.label = label;
            this.type = type;
            this.isUpdateable = isUpdateable;
            this.defaultSelected = defaultSelected;
            this.isCustom = isCustom;
        }

        public FieldDTO(){}
    }

    public class SubjectDTO {
        @AuraEnabled public SObject record;
        @AuraEnabled public List<NoteDTO> notes = new List<NoteDTO>();

        public SubjectDTO(SObject record, List<NoteDTO> notes){
            this.record = record;
            this.notes = notes;
        }
    }

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

    public class TableConfigDTO{
        @AuraEnabled public String objectName {get;set;}
        @AuraEnabled public List<FieldDTO> defaultFields {get;set;}

        public TableConfigDTO(String objectName, List<FieldDTO> defaultFields){
            this.objectName = objectName;
            this.defaultFields = defaultFields;
        }

        public Layout_Configuration__c convertToDbModel(){
            Layout_Configuration__c tableConfig = new Layout_Configuration__c();
            tableConfig.Object__c = this.objectName;
            String defaultFields = '';
            for(FieldDTO f : this.defaultFields){
                defaultFields += f.name + ',';
            }
            tableConfig.Default_Fieldset__c = defaultFields.removeEnd(',');
            return tableConfig;
        }
    }

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
}
