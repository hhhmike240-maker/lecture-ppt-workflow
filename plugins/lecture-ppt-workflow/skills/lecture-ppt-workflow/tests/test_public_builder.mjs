import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpec} from '../scripts/build_from_spec.mjs';

const spec = widths => ({version:1,font:'Test Font',slideSize:{width:960,height:540},slides:[{
  id:'table',notes:'Compare roles, then ask students to explain the handoff.',elements:[{
    type:'table',name:'roles',position:{left:50,top:120,width:700,height:200},
    fontSize:22,values:[['Role','Task'],['Teacher','Review']],columnWidths:widths
  }]
}]});

test('explicit table column widths accepted',()=>assert.equal(validateSpec(spec([250,450])).slides.length,1));
test('mismatched table width rejected',()=>assert.throws(()=>validateSpec(spec([250,400])),/columnWidths/));
test('negative table column rejected',()=>assert.throws(()=>validateSpec(spec([-100,800])),/columnWidths/));
test('wrong column count rejected',()=>assert.throws(()=>validateSpec(spec([700])),/columnWidths/));
