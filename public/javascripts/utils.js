/**
* @Author: Clément Dietschy <bedhed>
* @Date:   21-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 06-04-2017 01:48
* @Copyright: Clément Dietschy 2017
*/

function findAncestor(child, classSearched) {
    while ((child = child.parentElement) && !child.classList.contains(classSearched));
		return child;
}

function toggleItem(child) {
	findAncestor(child, 'item').classList.toggle('expanded');
}

function toggleLink(child) {
	var linkLi = findAncestor(child, 'link');
	linkLi.classList.toggle('deleted');
	var linkDeleted = linkLi.getElementsByClassName('deleted-input')[0];
	linkDeleted.value = linkDeleted.value == 'true' ? 'false' : 'true';
}

function togglePanel() {
	document.getElementById('left-panel').classList.toggle('open');
}

function getTemplate(templateName) {
  return document.getElementById(templateName + '-template').innerHTML;
}