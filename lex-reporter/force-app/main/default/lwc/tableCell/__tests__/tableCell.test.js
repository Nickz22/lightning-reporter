import { createElement } from 'lwc';
import TableCell from 'c/tableCell';
const Class = require('../../cell/Cell');

describe('a cell', () => {
    const editableTextCell = createElement('c-table-cell', {
        is: TableCell
    });

    // given editable text cell
    editableTextCell.cell = new Class.Cell(
        'DataId',
        'Label',
        'Value',
        'String',
        true,
        false,
        '',
        false
    );

    // given uneditable text cell
    const uneditableTextCell = createElement('c-table-cell', {
        is: TableCell
    });
    uneditableTextCell.cell = new Class.Cell(
        'DataId',
        'Label',
        'Value',
        'String',
        false,
        false,
        '',
        false
    );

    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('is editable text', () => {
        // when page renders
        document.body.appendChild(editableTextCell);

        // then editable cell is rendered
        const div = editableTextCell.shadowRoot.querySelector('div[data-id="DataId"]');
        expect(div).toBeTruthy();
        expect(div.classList.contains('read-only-padding')).toBe(true);

        // and editable cell contains input
        const input = editableTextCell.shadowRoot.querySelector('div[data-id="DataId"] lightning-input');
        expect(input).not.toBeUndefined();
        expect(input.value).toBe('Value');
        expect(input.dataset.id).toBe('DataId');

        // and when editable cell is clicked
        const handler = jest.fn();
        editableTextCell.addEventListener('cellclick', handler);
        div.click();

        // then cellclick event is fired
        //     and cell is not read-only
        return Promise.resolve().then(() => {
            expect(div.classList.contains('read-only-padding')).toBe(false);
            expect(handler).toHaveBeenCalled();
        });
    });

    it('is uneditable text', () => {
        // when page renders
        document.body.appendChild(uneditableTextCell);

        // then uneditable cell is rendered
        expect(
            uneditableTextCell.shadowRoot.querySelector('div[data-id="DataId"]')
        ).toBeFalsy();

        // and uneditable cell contains input
        const input = uneditableTextCell.shadowRoot.querySelector('lightning-input');
        expect(input).not.toBeUndefined();
        // check input for readonly
        expect(input.readOnly).toBeTruthy();
        expect(input.value).toBe('Value');
        expect(input.dataset.id).toBe('DataId');

        // and when uneditable cell is clicked
        input.click();
        const handler = jest.fn();
        uneditableTextCell.addEventListener('cellclick', handler);
        input.click();
        
        // cell is still read-only
        return Promise.resolve().then(() => {
            expect(handler).not.toHaveBeenCalled();
        });
    });
});