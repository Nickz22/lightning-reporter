@isTest
public with sharing class LightningReporterControllerTest {

    @TestSetup
    static void makeData(){
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        Contact testContact = new Contact(FirstName = 'Test', LastName = 'Contact', AccountId = testAccount.Id);
        insert testContact;
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

        
    }

}
