@isTest
public class TableRowControllerTest {
    
    @TestSetup
    static void makeData(){
        // insert test account
        Account acc = new Account(Name = 'Test Account');
        insert acc;
        // insert test contact
        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;
    }

    @isTest
    static void givenNoteWithMentions_verifyNoteAndRelatedMdSaved(){
        String runningUserName = UserInfo.getName();
        String noteBody = 'This is a test note with a mention of @<strong>'+runningUserName+'</strong>';

        Account acc = [SELECT Id FROM Account LIMIT 1];
        Contact con = [SELECT Id FROM Contact LIMIT 1];

        Test.startTest();
        DTO.NoteDTO n = TableRowController.saveNote(noteBody, con.Id, acc.Id);
        Test.stopTest();

        System.assertEquals(noteBody, n.note.Body);
        System.assertEquals(1, [SELECT count() 
                                  FROM Lightning_Reporter_Note_Metadata__c 
                                  WHERE Note_Id__c = :n.note.Id
                                        AND Mentioned_User__c = :UserInfo.getUserId()]);
    }

    @isTest
    static void givenNoteWithoutMentions_verifyNoteAndNoRelatedMdSaved(){
        String runningUserName = UserInfo.getName();
        String noteBody = 'This is just a test note';

        Account acc = [SELECT Id FROM Account LIMIT 1];
        Contact con = [SELECT Id FROM Contact LIMIT 1];

        Test.startTest();
        DTO.NoteDTO n = TableRowController.saveNote(noteBody, con.Id, acc.Id);
        Test.stopTest();

        System.assertEquals(noteBody, n.note.Body);
        System.assertEquals(0, [SELECT count() 
                                  FROM Lightning_Reporter_Note_Metadata__c 
                                  WHERE Note_Id__c = :n.note.Id
                                        AND Mentioned_User__c = :UserInfo.getUserId()]);
    }

    @isTest
    static void givenNote_verifyViewCounted(){
        String runningUserName = UserInfo.getName();
        String noteBody = 'This is just a test note';

        Account acc = [SELECT Id FROM Account LIMIT 1];
        Contact con = [SELECT Id FROM Contact LIMIT 1];

        DTO.NoteDTO n = TableRowController.saveNote(noteBody, con.Id, acc.Id);
        DTO.NoteMetadataDTO view = new DTO.NoteMetadataDTO();
        view.NoteId = n.note.Id;
        view.ViewedById = UserInfo.getUserId();
        view.NoteParentId = n.note.ParentId;
        view.TopMostId = acc.Id;

        Test.startTest();
        TableRowController.countView(view);
        Test.stopTest();

        System.assertEquals(1, [SELECT count()
                                FROM Lightning_Reporter_Note_Metadata__c
                                WHERE Viewed_By__c=: UserInfo.getUserId()]);
    }
}
