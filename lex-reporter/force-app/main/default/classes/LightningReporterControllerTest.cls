@isTest
public with sharing class LightningReporterControllerTest {

    @TestSetup
    static void makeData(){
        System.runAs(TestUtil.lightningReporterAdmin){
            Test.startTest();
            Account testAccount = new Account(Name = 'Test Account');
            insert testAccount;
            
            Contact testContact = new Contact(FirstName = 'Test', LastName = 'Contact', AccountId = testAccount.Id);
            insert testContact;

            List<Note> notes = new List<Note>();
            notes.add(new Note(
                Title = 'Test Note',
                ParentId = testContact.Id,
                Body = 'Test Note Body'
            ));
            notes.add(new Note(
                Title = 'Test Note 2',
                ParentId = testContact.Id,
                Body = 'Test Note Body 2'
            ));
            insert notes;
            Test.stopTest();
        }
    }

    @isTest
    static void givenContactListOnAccountPageWithNoAlerts_verifyContextData(){
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        List<DTO.FieldDTO> contactFields = LightningReporterController.getFieldsFromType('Contact');
        DTO.ContextDTO context = LightningReporterController.getContext('Contact', testAccount.Id, contactFields);

        System.assertEquals(1, context.subjects.size());
        System.assertEquals(0, context.alerts.size());

        DTO.SubjectDTO subject = context.subjects[0];
        System.assertEquals(2, subject.notes.size());
    }

    @isTest
    static void givenContactListOnAccountPageWithAlerts_verifyContextData(){
        System.runAs(TestUtil.lightningReporterAdmin){
            Account testAccount = [SELECT Id, (SELECT Id FROM Contacts LIMIT 1) FROM Account LIMIT 1];
            List<Note> notes = [SELECT Id, ParentId FROM Note];
            List<Note_Metadata__c> noteMetadata = new List<Note_Metadata__c>();
            for(Note note : notes){
                noteMetadata.add(
                    new Note_Metadata__c(
                        Note_Id__c = note.Id,
                        Mentioned_User__c = UserInfo.getUserId(),
                        Type__c = 'Mention',
                        Note_Parent_Id__c = testAccount.Contacts.get(0).Id,
                        Reporter_Context_Record_Id__c = testAccount.Id
                ));
            }
            insert noteMetadata;

            List<DTO.FieldDTO> contactFields = LightningReporterController.getFieldsFromType('Contact');
            DTO.ContextDTO context = LightningReporterController.getContext('Contact', testAccount.Id, contactFields);

            System.assertEquals(1, context.subjects.size());
            System.assertEquals(2, context.alerts.size());
        }
    }

    @isTest
    static void verifyGetFieldsFromType(){
        // given a Contact type
        String sObjectType = 'Contact';

        // when getFieldsFromType is called
        List<DTO.FieldDTO> fields = LightningReporterController.getFieldsFromType(sObjectType);

        // then all fields in the Contact schema are returned
        System.assertEquals(contact.SObjectType.getDescribe().fields.getMap().size(), fields.size());
    }

    @isTest
    static void givenRecordId_verifyChildTypesWithNotesSubRelationshipReturned(){
        Id accountId = [SELECT Id FROM Account LIMIT 1].Id;
        Id contactId = [SELECT Id FROM Contact LIMIT 1].Id;

        List<String> accountChildTypes = LightningReporterController.getChildTypes(accountId);
        List<String> contactChildTypes = LightningReporterController.getChildTypes(contactId);

        Map<String, Schema.SObjectField> noteFieldTokenByName = Note.SObjectType.getDescribe().fields.getMap();
        Schema.SObjectField parentIdField = noteFieldTokenByName.get('ParentId');
        List<SObjectType> parentTypes = parentIdField.getDescribe().getReferenceTo();

        Set<String> parentTypeNames = new Set<String>();
        for(SObjectType parentType : parentTypes){
            parentTypeNames.add(parentType.getDescribe().getName());
        }

        System.assertEquals(true, parentTypeNames.containsAll(accountChildTypes));
        System.assertEquals(true, parentTypeNames.containsAll(contactChildTypes));
    }

    @isTest
    static void givenFields_verifyPinnedViewAndViewRetrieval(){
        List<DTO.FieldDTO> fields = LightningReporterController.getFieldsFromType('Contact');
        List<DTO.FieldDTO> allowableFields = new List<DTO.FieldDTO>();
        for(Integer i = 0; i < 10; i++){
            allowableFields.add(fields[i]);
        }

        LightningReporterController.pinLayout('Contact', allowableFields);
        
        List<DTO.TableConfigDTO> layouts = LightningReporterController.getPinnedViews();
        System.assertEquals(1, layouts.size());

        for(DTO.TableConfigDTO layout : layouts){
            System.assertEquals('Contact', layout.objectName);
            System.assertEquals(allowableFields.size(), layout.defaultFields.size());
        }
    }
}