class TodoList {
  constructor(el) {
    this.el = el;
    this.init();
  }

  init() {
    this.el.querySelectorAll("li").forEach(li => {
      li.tabIndex = 0;
      this.addHoverButtons(li);
    });
    this.bindEvents();
    this.initNewTodoButton();
  }

  initNewTodoButton() {
    const newTodoBtn = document.getElementById("new-todo");
    if (newTodoBtn) {
      newTodoBtn.addEventListener("click", () => {
        this.createNewTodo();
      });
    }
  }

  createNewTodo() {
    // Create a new todo item and enter edit mode immediately
    const newLi = document.createElement("li");
    newLi.tabIndex = 0;
    newLi.dataset.id = crypto.randomUUID();

    // Create the label span
    const labelSpan = document.createElement("span");
    labelSpan.className = "todo-label";
    labelSpan.textContent = "TODO";
    newLi.appendChild(labelSpan);

    // Create the text span
    const textSpan = document.createElement("span");
    textSpan.className = "todo-text";
    textSpan.textContent = "New todo";
    newLi.appendChild(textSpan);

    // Add spacing
    newLi.appendChild(document.createTextNode(" "));

    // Add hover buttons
    this.addHoverButtons(newLi);

    // Add to the list
    this.el.appendChild(newLi);

    // Enter edit mode immediately
    this.enterEditMode(newLi);

    // Emit add event
    this.emit("todo:add", { 
      text: "New todo", 
      id: newLi.dataset.id,
      parentId: null
    });
  }

  bindEvents() {


    this.el.addEventListener("click", e => {
      const li = e.target.closest("li");
      if (!li) return;

      // Check if click is on a button (metadata buttons should handle their own clicks)
      if (e.target.tagName === "BUTTON") {
        return; // Let button handle its own click
      }

      // Check if click is on edit input (don't navigate when editing)
      if (e.target.classList.contains("todo-edit-input")) {
        return; // Let edit input handle its own clicks
      }

      // Navigate to solo view when clicking anywhere on the todo item
      console.log("Todo item clicked", li.dataset.id);
      const todoId = li.dataset.id;
      const todoText = li.querySelector(".todo-text").textContent;
      const todoStatus = li.classList.contains("completed") ? "completed" : 
                        li.classList.contains("no-label") ? "heading" : "todo";
      
      // Navigate to todo detail page with URL parameters
      const url = `todo.html?id=${encodeURIComponent(todoId)}&text=${encodeURIComponent(todoText)}&status=${encodeURIComponent(todoStatus)}`;
      window.location.href = url;
      
      this.emit("todo:navigate", {
        id: li.dataset.id,
        text: li.querySelector(".todo-text").textContent
      });
    });

    this.el.addEventListener("keydown", e => {
      const li = e.target.closest("li");
      if(!li) return;

      // If any todo is in edit mode, ignore all shortcuts except for the edit input itself
      if (this.el.querySelector("li.editing")) {
        // Only allow edit input to handle its own events
        if (!e.target.classList.contains("todo-edit-input")) {
          return;
        }
        // If this is the edit input, let it handle its own events (Enter, Escape, etc.)
        return;
      }

      const siblings = this.getSiblings(li);
      const idx = siblings.indexOf(li);

      // Enter edit mode
      if(e.key==="e" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.enterEditMode(li);
        return;
      }

      // Add/cycle tags with 't' key
      if(e.key==="t" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const tagsBtn = li.querySelector(".tags-button");
        if (tagsBtn) {
          this.showTagsPopup(li, tagsBtn);
        }
        return;
      }

      // Toggle priority with 'p' key
      if(e.key==="p" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.togglePriority(li);
        return;
      }

      // Toggle on hold with 'h' key
      if(e.key==="h" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.toggleOnHold(li);
        return;
      }

      // Set due date with 'd' key
      if(e.key==="d" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const scheduleBtn = li.querySelector(".schedule-button");
        if (scheduleBtn) {
          this.showSchedulePopup(li, scheduleBtn);
        }
        return;
      }

      // Assign with 'a' key
      if(e.key==="a" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const assignBtn = li.querySelector(".assign-button");
        if (assignBtn) {
          this.showAssignPopup(li, assignBtn);
        }
        return;
      }

      // Navigate to solo view with Enter
      if(e.key==="Enter" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const todoId = li.dataset.id;
        const todoText = li.querySelector(".todo-text")?.textContent;
        const todoStatus = li.classList.contains("completed") ? "completed" : 
                          li.classList.contains("no-label") ? "heading" : "todo";
        
        // Navigate to todo detail page with URL parameters
        const url = `todo.html?id=${encodeURIComponent(todoId)}&text=${encodeURIComponent(todoText)}&status=${encodeURIComponent(todoStatus)}`;
        window.location.href = url;
        
        this.emit("todo:navigate", {
          id: li.dataset.id,
          text: li.querySelector(".todo-text")?.textContent
        });
        return;
      }

      // Create new sibling todo with Alt+Enter
      if(e.key==="Enter" && e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.addSiblingTodo(li);
        return;
      }

      // Cycle collapsed/expanded with Alt+Tab
      if(e.key==="Tab" && e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.cycleCollapsedState(li);
        return;
      }

      // Toggle complete (legacy - keeping space for compatibility)
      if(e.key===" " && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.toggleItem(li);
      }

      // Cycle states with Shift + left/right arrows
      if(e.key==="ArrowLeft" && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.cycleTodoStateBackward(li);
        return;
      }

      if(e.key==="ArrowRight" && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.cycleTodoStateForward(li);
        return;
      }

      // Navigate
      if(e.key==="ArrowDown") {
        e.preventDefault();
        if(idx < siblings.length - 1) {
          siblings[idx+1].focus();
        } else {
          // last child, move to next available item by traversing up the hierarchy
          this.navigateToNextItem(li);
        }
      }

      if(e.key==="ArrowUp") {
        e.preventDefault();
        if(idx > 0) {
          siblings[idx-1].focus();
        } else {
          // first child, move focus to parent li if exists
          const parentLi = li.parentNode.closest("li");
          if(parentLi) parentLi.focus();
        }
      }

      // Navigate into first child with right arrow (if no Alt)
      // Navigate into first child with right arrow (if no Alt)
      if (!e.altKey && e.key === "ArrowRight") {
        const sublist = li.querySelector("ul");
        if (sublist && sublist.children.length > 0) {
          e.preventDefault();

          // If collapsed, expand first-level children only
          if (li.classList.contains("collapsed")) {
            this.expandItem(li); // only expands direct children
          }

          const firstChild = sublist.querySelector("li");
          if (firstChild) firstChild.focus();
        }
      }


      // Navigate back to parent with left arrow (if no Alt)
      if (!e.altKey && e.key === "ArrowLeft") {
        const parentLi = li.parentNode.closest("li");
        if (parentLi) {
          e.preventDefault();
          parentLi.focus();
        }
      }



      // Alt keys
      if(e.altKey){
        // Reorder
        if(e.key==="ArrowUp" && idx>0){
          e.preventDefault();
          li.parentNode.insertBefore(li, siblings[idx-1]);
          li.focus();
          this.emit("todo:move",{id:li.dataset.id,from:idx,to:idx-1});
        }
        if(e.key==="ArrowDown" && idx<siblings.length-1){
          e.preventDefault();
          li.parentNode.insertBefore(siblings[idx+1], li);
          li.focus();
          this.emit("todo:move",{id:li.dataset.id,from:idx,to:idx+1});
        }
        // Hierarchy
        if(e.key==="ArrowRight"){ e.preventDefault(); this.indentItem(li); }
        if(e.key==="ArrowLeft"){ e.preventDefault(); this.outdentItem(li); }
        // Collapse / Expand
        if(e.key.toUpperCase()==="H"){ e.preventDefault(); this.collapseItem(li); }
        if(e.key.toUpperCase()==="L"){ e.preventDefault(); this.expandItem(li); }
      }
    });

    this.el.addEventListener("click", e=>{
      const li=e.target.closest("li.has-children");
      if(li && e.target === li.querySelector("::before")){ // pseudo-element won't trigger directly
        const sublist=li.querySelector("ul");
        if(sublist.style.display==="none") this.expandItem(li);
        else this.collapseItem(li);
      }
    });
  }

  getItems() { return Array.from(this.el.querySelectorAll("li")); }
  getSiblings(li){ return Array.from(li.parentNode.children).filter(c=>c.tagName==="LI"); }

  toggleItem(li) {
    const label = li.querySelector(".todo-label");
    if (!label) return;

    // Determine current state and cycle to next
    let currentState, nextState;
    
    if (li.classList.contains("completed")) {
      // DONE → no label
      currentState = "completed";
      nextState = "none";
      li.classList.remove("completed");
      li.classList.add("no-label");
      label.style.display = "none";
    } else if (li.classList.contains("no-label")) {
      // no label → TODO
      currentState = "none";
      nextState = "todo";
      li.classList.remove("no-label");
      label.style.display = "";
      label.textContent = "TODO";
    } else {
      // TODO → DONE
      currentState = "todo";
      nextState = "completed";
      li.classList.add("completed");
      label.textContent = "DONE";
    }

    this.emit("todo:toggle", {
      id: li.dataset.id,
      from: currentState,
      to: nextState,
      completed: li.classList.contains("completed"),
      hasLabel: !li.classList.contains("no-label")
    });

    let parentLi = li.parentNode.closest("li");
    while(parentLi) {
      this.updateChildCount(parentLi);
      parentLi = parentLi.parentNode.closest("li");
    }

    // Update hover buttons to reflect new state
    this.updateHoverButtons(li);
  }


  addItem(text, parentLi) {
    const li = document.createElement("li");
    li.tabIndex = 0;
    li.dataset.id = crypto.randomUUID();

    // Create label span
    const label = document.createElement("span");
    label.className = "todo-label";
    label.textContent = "TODO";

    // Create text span
    const spanText = document.createElement("span");
    spanText.className = "todo-text";
    spanText.textContent = text;

    li.appendChild(label);
    li.appendChild(document.createTextNode(" "));
    li.appendChild(spanText);

    // Add hover buttons
    this.addHoverButtons(li);

    if (parentLi) {
      let sublist = parentLi.querySelector("ul");
      if (!sublist) {
        sublist = document.createElement("ul");
        parentLi.appendChild(sublist);
        parentLi.classList.add("has-children");
      }
      sublist.appendChild(li);
    } else {
      this.el.appendChild(li);
    }

    li.focus();
    this.emit("todo:add", { text, id: li.dataset.id });

    if (parentLi) this.updateChildCount(parentLi);
  }


  indentItem(li){
    const siblings=this.getSiblings(li); const idx=siblings.indexOf(li);
    if(idx===0) return;
    const prev=siblings[idx-1];
    let sublist=prev.querySelector("ul");
    if(!sublist){ sublist=document.createElement("ul"); prev.appendChild(sublist); }
    sublist.appendChild(li); li.focus();
    this.emit("todo:indent",{id:li.dataset.id,parent:prev.dataset.id});

    this.updateChildCount(prev);
    const newParentLi = li.parentNode.closest("li");
    if (newParentLi) this.updateChildCount(newParentLi);
  }

  outdentItem(li){
    const parentUl=li.parentNode;
    if(parentUl===this.el) return;
    const parentLi=parentUl.closest("li"); const grandUl=parentLi.parentNode;
    grandUl.insertBefore(li,parentLi.nextSibling); li.focus();
    this.emit("todo:outdent",{id:li.dataset.id,newParent:grandUl.id||null});

    this.updateChildCount(parentLi);
    const newParentLi = li.parentNode.closest("li");
    if (newParentLi) this.updateChildCount(newParentLi);
  }

  collapseItem(li){
    const sublist=li.querySelector("ul");
    if(sublist){
        sublist.style.display="none";
        li.classList.add("collapsed");
    }
    this.emit("todo:collapse",{id:li.dataset.id});
  }

  expandItem(li){
    const sublist=li.querySelector("ul");
    if(sublist){
        sublist.style.display="block";
        li.classList.remove("collapsed");
    }
    this.emit("todo:expand",{id:li.dataset.id});
  }

  updateChildCount(li) {
    const sublist = li.querySelector("ul");
    let countSpan = li.querySelector(".child-count");

    if (!sublist || sublist.children.length === 0) {
        // Remove count if no children
        if (countSpan) countSpan.remove();
        return;
    }

    // Count direct children
    const children = Array.from(sublist.children).filter(c => c.tagName === "LI");
    // Only count items with labels as "completable" - no-label items are headers
    const completableChildren = children.filter(c => !c.classList.contains("no-label"));
    const doneCount = completableChildren.filter(c => c.classList.contains("completed")).length;

    if (!countSpan) {
        countSpan = document.createElement("span");
        countSpan.className = "child-count";
        // Append **after the text span**
        const textSpan = li.querySelector(".todo-text");
        if (textSpan) textSpan.after(countSpan);
        else li.appendChild(countSpan);
    }

    // Show count only if there are completable children
    if (completableChildren.length > 0) {
        countSpan.textContent = `[${doneCount}/${completableChildren.length}]`;
        countSpan.style.display = "";
    } else {
        countSpan.style.display = "none";
    }
  }



  enterEditMode(li) {
    // Don't enter edit mode if already editing
    if (li.classList.contains("editing")) return;
    
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;
    
    const currentText = textSpan.textContent;
    
    // Create input element
    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-edit-input";
    input.value = currentText;
    
    // Add editing class and insert input
    li.classList.add("editing");
    textSpan.after(input);
    
    // Focus and select all text
    input.focus();
    input.select();
    
    // Handle input events
    const handleKeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.altKey) {
          // Alt+Enter: Save current edit and add new todo
          this.saveEdit(li, input.value);
          // Add new sibling todo after the current one and enter edit mode
          this.addSiblingTodo(li);
        } else {
          // Regular Enter: Just save
          this.saveEdit(li, input.value);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.exitEditMode(li);
      }
    };
    
    const handleBlur = () => {
      this.saveEdit(li, input.value);
    };
    
    input.addEventListener("keydown", handleKeydown);
    input.addEventListener("blur", handleBlur);
    
    // Store event handlers for cleanup
    input._handleKeydown = handleKeydown;
    input._handleBlur = handleBlur;
    
    this.emit("todo:edit:start", {
      id: li.dataset.id,
      originalText: currentText
    });
  }
  
  exitEditMode(li) {
    const input = li.querySelector(".todo-edit-input");
    if (!input) return;
    
    // Remove event listeners
    input.removeEventListener("keydown", input._handleKeydown);
    input.removeEventListener("blur", input._handleBlur);
    
    // Remove input and editing class
    input.remove();
    li.classList.remove("editing");
    
    // Restore focus to li
    li.focus();
    
    this.emit("todo:edit:cancel", {
      id: li.dataset.id
    });
  }
  
  saveEdit(li, newText) {
    const input = li.querySelector(".todo-edit-input");
    if (!input) return;
    
    const textSpan = li.querySelector(".todo-text");
    const originalText = textSpan.textContent;
    
    // Trim whitespace
    newText = newText.trim();
    
    // If empty, revert to original
    if (!newText) {
      newText = originalText;
    }
    
    // Update text content
    textSpan.textContent = newText;
    
    // Remove event listeners
    input.removeEventListener("keydown", input._handleKeydown);
    input.removeEventListener("blur", input._handleBlur);
    
    // Remove input and editing class
    input.remove();
    li.classList.remove("editing");
    
    // Restore focus to li
    li.focus();
    
    // Emit event if text actually changed
    if (newText !== originalText) {
      this.emit("todo:edit:save", {
        id: li.dataset.id,
        originalText: originalText,
        newText: newText
      });
    } else {
      this.emit("todo:edit:cancel", {
        id: li.dataset.id
      });
    }
  }

  addSiblingTodo(li) {
    // Find the parent container (either main ul or parent li's sublist)
    const parentContainer = li.parentNode;
    const parentLi = parentContainer.closest("li");
    
    // Create new todo item
    const newLi = document.createElement("li");
    newLi.tabIndex = 0;
    newLi.dataset.id = crypto.randomUUID();
    
    // Create label span
    const label = document.createElement("span");
    label.className = "todo-label";
    label.textContent = "TODO";
    
    // Create text span with placeholder
    const spanText = document.createElement("span");
    spanText.className = "todo-text";
    spanText.textContent = "New todo";
    
        newLi.appendChild(label);
    // Add a space between label and text (like in HTML)
    newLi.appendChild(document.createTextNode(" "));
    newLi.appendChild(spanText);

    // Add hover buttons
    this.addHoverButtons(newLi);

    // Insert after current li
    li.after(newLi);

    // Update parent child count if needed
    if (parentLi) this.updateChildCount(parentLi);

    // Enter edit mode immediately
    this.enterEditMode(newLi);
    
    this.emit("todo:add", { 
      text: "New todo", 
      id: newLi.dataset.id,
      parentId: parentLi?.dataset.id || null
    });
  }

  cycleCollapsedState(li) {
    const sublist = li.querySelector("ul");
    
    // Count actual child li elements
    const childItems = sublist ? Array.from(sublist.children).filter(c => c.tagName === "LI") : [];
    
    if (childItems.length === 0) {
      // No children, nothing to collapse/expand
      return;
    }
    
    if (li.classList.contains("collapsed")) {
      // Currently collapsed, expand it
      this.expandItem(li);
    } else {
      // Currently expanded (or normal), collapse it
      this.collapseItem(li);
    }
  }

  navigateToNextItem(li) {
    // Traverse up the hierarchy until we find a parent with a next sibling
    let currentLi = li;
    
    while (currentLi) {
      const parentUl = currentLi.parentNode;
      const parentLi = parentUl.closest("li");
      
      if (!parentLi) {
        // We've reached the root level, no more navigation possible
        return;
      }
      
      // Get siblings of the parent
      const parentSiblings = Array.from(parentLi.parentNode.children).filter(c => c.tagName === "LI");
      const parentIdx = parentSiblings.indexOf(parentLi);
      
      if (parentIdx < parentSiblings.length - 1) {
        // Found a parent with a next sibling, focus on it
        parentSiblings[parentIdx + 1].focus();
        return;
      }
      
      // This parent is also the last child, continue traversing up
      currentLi = parentLi;
    }
  }

  cycleTodoStateForward(li) {
    // Same as toggleItem - cycles TODO → DONE → no label → TODO
    this.toggleItem(li);
  }

  cycleTodoStateBackward(li) {
    const label = li.querySelector(".todo-label");
    if (!label) return;

    // Cycle backward: TODO → no label → DONE → TODO
    let currentState, nextState;
    
    if (li.classList.contains("completed")) {
      // DONE → TODO
      currentState = "completed";
      nextState = "todo";
      li.classList.remove("completed");
      label.style.display = "";
      label.textContent = "TODO";
    } else if (li.classList.contains("no-label")) {
      // no label → DONE
      currentState = "none";
      nextState = "completed";
      li.classList.remove("no-label");
      li.classList.add("completed");
      label.style.display = "";
      label.textContent = "DONE";
    } else {
      // TODO → no label
      currentState = "todo";
      nextState = "none";
      li.classList.add("no-label");
      label.style.display = "none";
    }

    this.emit("todo:toggle", {
      id: li.dataset.id,
      from: currentState,
      to: nextState,
      completed: li.classList.contains("completed"),
      hasLabel: !li.classList.contains("no-label")
    });

    let parentLi = li.parentNode.closest("li");
    while(parentLi) {
      this.updateChildCount(parentLi);
      parentLi = parentLi.parentNode.closest("li");
    }

    // Update hover buttons to reflect new state
    this.updateHoverButtons(li);
  }

  scheduleItem(li) {
    // Use the same logic as setScheduleDate but with current date
    const now = new Date();
    this.setScheduleDate(li, now);
  }

  assignItem(li) {
    const assignSpan = li.querySelector(".todo-assign");
    
    // For demo purposes, cycle through some example assignees
    const assignees = ["alice", "bob", "charlie", "diana"];
    const currentAssignee = assignSpan ? assignSpan.textContent.trim() : "";
    const currentIndex = assignees.indexOf(currentAssignee);
    const nextIndex = (currentIndex + 1) % assignees.length;
    const nextAssignee = assignees[nextIndex];
    
    this.setAssignee(li, nextAssignee);
  }

  tagItem(li) {
    const tagsSpan = li.querySelector(".todo-tags");

    // For demo purposes, cycle through some example tag combinations
    const tagSets = [
      ["urgent"],
      ["urgent", "bug"],
      ["feature"],
      ["feature", "ui"],
      ["docs"],
      []  // no tags
    ];
    
    const currentTags = tagsSpan ? tagsSpan.textContent.trim() : "";
    const currentIndex = tagSets.findIndex(tags => 
      tags.length === 0 ? currentTags === "" : currentTags === ` ${tags.join(" ")}`
    );
    const nextIndex = (currentIndex + 1) % tagSets.length;
    const nextTags = tagSets[nextIndex];
    
    this.setTags(li, nextTags);
  }

  addHoverButtons(li) {
    // Don't add buttons if they already exist
    if (li.querySelector(".todo-hover-buttons")) return;

    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "todo-hover-buttons";

    // Priority button
    const priorityBtn = document.createElement("button");
    priorityBtn.className = "hover-button priority-button";
    priorityBtn.setAttribute("data-type", "priority");
    priorityBtn.tabIndex = -1; // Remove from tab navigation
    priorityBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePriority(li);
    });

    // On hold button
    const onHoldBtn = document.createElement("button");
    onHoldBtn.className = "hover-button onhold-button";
    onHoldBtn.setAttribute("data-type", "onhold");
    onHoldBtn.tabIndex = -1; // Remove from tab navigation
    onHoldBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleOnHold(li);
    });

    // Schedule button
    const scheduleBtn = document.createElement("button");
    scheduleBtn.className = "hover-button schedule-button";
    scheduleBtn.setAttribute("data-type", "schedule");
    scheduleBtn.tabIndex = -1; // Remove from tab navigation
    scheduleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showSchedulePopup(li, scheduleBtn);
    });

    // Assign button
    const assignBtn = document.createElement("button");
    assignBtn.className = "hover-button assign-button";
    assignBtn.setAttribute("data-type", "assign");
    assignBtn.tabIndex = -1; // Remove from tab navigation
    assignBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showAssignPopup(li, assignBtn);
    });

    // Tags button
    const tagsBtn = document.createElement("button");
    tagsBtn.className = "hover-button tags-button";
    tagsBtn.setAttribute("data-type", "tags");
    tagsBtn.tabIndex = -1; // Remove from tab navigation
    tagsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showTagsPopup(li, tagsBtn);
    });

    // State button (for cycling TODO/DONE/no-label)
    const stateBtn = document.createElement("button");
    stateBtn.className = "hover-button state-button";
    stateBtn.setAttribute("data-type", "state");
    stateBtn.tabIndex = -1; // Remove from tab navigation
    stateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleItem(li);
    });

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "hover-button edit-button";
    editBtn.setAttribute("data-type", "edit");
    editBtn.textContent = "edit";
    editBtn.tabIndex = -1; // Remove from tab navigation
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.enterEditMode(li);
    });

    buttonsContainer.appendChild(priorityBtn);
    buttonsContainer.appendChild(onHoldBtn);
    buttonsContainer.appendChild(scheduleBtn);
    buttonsContainer.appendChild(assignBtn);
    buttonsContainer.appendChild(tagsBtn);
    buttonsContainer.appendChild(stateBtn);
    buttonsContainer.appendChild(editBtn);
    
    // Insert after the todo text span
    const textSpan = li.querySelector(".todo-text");
    if (textSpan) {
      textSpan.after(buttonsContainer);
    } else {
      li.appendChild(buttonsContainer);
    }
    
    // Update button text based on current data
    this.updateHoverButtons(li);
  }

  updateHoverButtons(li) {
    const priorityBtn = li.querySelector(".priority-button");
    const onHoldBtn = li.querySelector(".onhold-button");
    const scheduleBtn = li.querySelector(".schedule-button");
    const assignBtn = li.querySelector(".assign-button");
    const tagsBtn = li.querySelector(".tags-button");
    const stateBtn = li.querySelector(".state-button");
    const editBtn = li.querySelector(".edit-button");
    
    if (!priorityBtn || !onHoldBtn || !scheduleBtn || !assignBtn || !tagsBtn || !stateBtn || !editBtn) return;
    
    let hasAnyData = false;
    
    // Update priority button
    const isPriority = li.classList.contains("priority");
    if (isPriority) {
      priorityBtn.textContent = "priority";
      priorityBtn.classList.add("has-data");
      hasAnyData = true;
    } else {
      priorityBtn.textContent = "priority";
      priorityBtn.classList.remove("has-data");
    }
    
    // Update on hold button
    const isOnHold = li.classList.contains("on-hold");
    if (isOnHold) {
      onHoldBtn.textContent = "on hold";
      onHoldBtn.classList.add("has-data");
      hasAnyData = true;
    } else {
      onHoldBtn.textContent = "on hold";
      onHoldBtn.classList.remove("has-data");
    }
    
    // Update schedule button
    const scheduleSpan = li.querySelector(".todo-schedule");
    if (scheduleSpan && scheduleSpan.textContent.trim()) {
      scheduleBtn.textContent = scheduleSpan.textContent.trim();
      scheduleBtn.classList.add("has-data");
      hasAnyData = true;
    } else {
      scheduleBtn.textContent = "due on";
      scheduleBtn.classList.remove("has-data");
    }
    
    // Update assign button
    const assignSpan = li.querySelector(".todo-assign");
    if (assignSpan && assignSpan.textContent.trim()) {
      assignBtn.textContent = `@${assignSpan.textContent.trim()}`;
      assignBtn.classList.add("has-data");
      hasAnyData = true;
    } else {
      assignBtn.textContent = "assign";
      assignBtn.classList.remove("has-data");
    }
    
    // Update tags button
    const tagsSpan = li.querySelector(".todo-tags");
    if (tagsSpan && tagsSpan.textContent.trim()) {
      const tags = tagsSpan.textContent.trim().split(' ').filter(tag => tag.length > 0);
      tagsBtn.textContent = tags.map(tag => `#${tag}`).join(' ');
      tagsBtn.classList.add("has-data");
      hasAnyData = true;
    } else {
      tagsBtn.textContent = "tags";
      tagsBtn.classList.remove("has-data");
    }
    
    // State button shows what clicking will do (next state)
    if (li.classList.contains("completed")) {
      stateBtn.textContent = "Heading"; // DONE → none (heading)
      stateBtn.classList.remove("has-data");
    } else if (li.classList.contains("no-label")) {
      stateBtn.textContent = "TODO"; // none → TODO
      stateBtn.classList.remove("has-data");
    } else {
      stateBtn.textContent = "DONE"; // TODO → DONE
      stateBtn.classList.remove("has-data");
    }

    // Edit button always shows "edit" and doesn't have data states
    editBtn.textContent = "edit";
    editBtn.classList.remove("has-data"); // Edit button is never in "has-data" state
    
    // Add/remove has-data class on the li element
    if (hasAnyData) {
      li.classList.add("has-data");
    } else {
      li.classList.remove("has-data");
    }
  }

  closeAllPopups(focusElement = null) {
    document.querySelectorAll('.todo-popup').forEach(popup => popup.remove());
    if (focusElement) {
      focusElement.focus();
    }
  }

  positionPopup(popup, button) {
    // Append to the todo list container, not document.body
    this.el.style.position = 'relative'; // Ensure container is positioned
    this.el.appendChild(popup);
    
    // Get button position relative to the list container
    const containerRect = this.el.getBoundingClientRect();
    
    // Check if button is visible and has proper dimensions
    const buttonRect = button.getBoundingClientRect();
    if (buttonRect.width === 0 || buttonRect.height === 0) {
      // Button is not visible (hidden), position relative to the todo item instead
      const li = button.closest('li');
      if (li) {
        const liRect = li.getBoundingClientRect();
        const left = liRect.right - containerRect.left - 200; // Position near right side of todo
        const top = liRect.top - containerRect.top;
        popup.style.left = `${Math.max(0, left)}px`;
        popup.style.top = `${top}px`;
        return;
      }
    }
    
    const left = buttonRect.left - containerRect.left;
    const top = buttonRect.bottom - containerRect.top + 5;
    
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  showSchedulePopup(li, button) {
    this.closeAllPopups();
    
    const popup = document.createElement('div');
    popup.className = 'todo-popup date-popup';
    
    // Date input
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'dropdown-input';
    
    // Set default to today
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
    
    popup.appendChild(dateInput);
    
    // Handle date selection
    dateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        const selectedDate = new Date(e.target.value + 'T00:00:00');
        this.setScheduleDate(li, selectedDate);
        this.closeAllPopups();
      }
    });
    
    dateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllPopups(li);
      }
    });
    
    // Position popup relative to the list container
    this.positionPopup(popup, button);
    
    // Focus the input
    setTimeout(() => dateInput.focus(), 0);
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!popup.contains(e.target)) {
          this.closeAllPopups(li);
        }
      }, { once: true });
    }, 0);
  }

  setScheduleDate(li, date) {
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;

    let scheduleSpan = li.querySelector(".todo-schedule");
    if (!scheduleSpan) {
      scheduleSpan = document.createElement("span");
      scheduleSpan.className = "todo-schedule";
      scheduleSpan.style.display = "none"; // Hide the span, show in button
      // Insert after buttons container if it exists, otherwise after text
      const buttonsContainer = li.querySelector(".todo-hover-buttons");
      if (buttonsContainer) {
        buttonsContainer.after(scheduleSpan);
      } else {
        textSpan.after(scheduleSpan);
      }
    }

    const timestamp = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    scheduleSpan.textContent = ` ${timestamp}`;

    // Update the hover button to show the data
    this.updateHoverButtons(li);

    // Restore focus to the todo item
    li.focus();

    this.emit("todo:due", {
      id: li.dataset.id,
      text: textSpan.textContent,
      timestamp: date.toISOString()
    });
  }

  showAssignPopup(li, button) {
    this.closeAllPopups();
    
    const popup = document.createElement('div');
    popup.className = 'todo-popup dropdown-popup';
    
    // Input for new assignee
    const input = document.createElement('input');
    input.className = 'dropdown-input';
    input.placeholder = 'Enter assignee name...';
    popup.appendChild(input);
    
    // Predefined assignees
    const assignees = ['alice', 'bob', 'charlie', 'diana', 'eve'];
    assignees.forEach(assignee => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = assignee;
      item.addEventListener('click', () => {
        this.setAssignee(li, assignee);
        this.closeAllPopups();
      });
      popup.appendChild(item);
    });
    
    // Handle input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = input.value.trim();
        if (value) {
          this.setAssignee(li, value);
          this.closeAllPopups();
        }
      } else if (e.key === 'Escape') {
        this.closeAllPopups(li);
      }
    });
    
    // Position popup relative to the list container
    this.positionPopup(popup, button);
    
    input.focus();
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!popup.contains(e.target)) {
          this.closeAllPopups(li);
        }
      }, { once: true });
    }, 0);
  }

  setAssignee(li, assignee) {
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;

    let assignSpan = li.querySelector(".todo-assign");
    if (!assignSpan) {
      assignSpan = document.createElement("span");
      assignSpan.className = "todo-assign";
      assignSpan.style.display = "none"; // Hide the span, show in button
      // Insert after buttons container if it exists, otherwise after text
      const buttonsContainer = li.querySelector(".todo-hover-buttons");
      if (buttonsContainer) {
        buttonsContainer.after(assignSpan);
      } else {
        textSpan.after(assignSpan);
      }
    }

    assignSpan.textContent = ` ${assignee}`;

    // Update the hover button to show the data
    this.updateHoverButtons(li);

    // Restore focus to the todo item
    li.focus();

    this.emit("todo:assign", {
      id: li.dataset.id,
      text: textSpan.textContent,
      assignee: assignee
    });
  }

  showTagsPopup(li, button) {
    this.closeAllPopups();
    
    const popup = document.createElement('div');
    popup.className = 'todo-popup dropdown-popup';
    
    // Input for new tag
    const input = document.createElement('input');
    input.className = 'dropdown-input';
    input.placeholder = 'Enter tags (space separated)...';
    popup.appendChild(input);
    
    // Predefined tag sets
    const tagSets = [
      ['urgent'],
      ['urgent', 'bug'],
      ['feature'],
      ['feature', 'ui'],
      ['docs'],
      ['review'],
      ['testing']
    ];
    
    tagSets.forEach(tags => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = tags.join(' ');
      item.addEventListener('click', () => {
        this.setTags(li, tags);
        this.closeAllPopups();
      });
      popup.appendChild(item);
    });
    
    // Handle input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = input.value.trim();
        if (value) {
          const tags = value.split(/\s+/).filter(tag => tag.length > 0);
          this.setTags(li, tags);
          this.closeAllPopups();
        }
      } else if (e.key === 'Escape') {
        this.closeAllPopups(li);
      }
    });
    
    // Position popup relative to the list container
    this.positionPopup(popup, button);
    
    input.focus();
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!popup.contains(e.target)) {
          this.closeAllPopups(li);
        }
      }, { once: true });
    }, 0);
  }

  setTags(li, tags) {
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;

    let tagsSpan = li.querySelector(".todo-tags");
    if (!tagsSpan) {
      tagsSpan = document.createElement("span");
      tagsSpan.className = "todo-tags";
      tagsSpan.style.display = "none"; // Hide the span, show in button
      // Insert after buttons container if it exists, otherwise after text
      const buttonsContainer = li.querySelector(".todo-hover-buttons");
      if (buttonsContainer) {
        buttonsContainer.after(tagsSpan);
      } else {
        textSpan.after(tagsSpan);
      }
    }

    tagsSpan.textContent = tags.length > 0 ? ` ${tags.join(' ')}` : "";

    // Update the hover button to show the data
    this.updateHoverButtons(li);

    // Restore focus to the todo item
    li.focus();

    this.emit("todo:tags", {
      id: li.dataset.id,
      text: textSpan.textContent,
      tags: tags
    });
  }

  togglePriority(li) {
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;

    // Check if already has priority
    const isPriority = li.classList.contains("priority");
    
    if (isPriority) {
      // Remove priority
      li.classList.remove("priority");
      const prioritySpan = li.querySelector(".todo-priority");
      if (prioritySpan) {
        prioritySpan.remove();
      }
    } else {
      // Add priority
      li.classList.add("priority");
      
      // Create hidden priority span (like other metadata)
      let prioritySpan = li.querySelector(".todo-priority");
      if (!prioritySpan) {
        prioritySpan = document.createElement("span");
        prioritySpan.className = "todo-priority";
        prioritySpan.style.display = "none"; // Hide the span, show in button
        // Insert after buttons container if it exists, otherwise after text
        const buttonsContainer = li.querySelector(".todo-hover-buttons");
        if (buttonsContainer) {
          buttonsContainer.after(prioritySpan);
        } else {
          textSpan.after(prioritySpan);
        }
      }
      prioritySpan.textContent = " priority";
    }

    // Update the hover button to show the data
    this.updateHoverButtons(li);

    // Restore focus to the todo item
    li.focus();

    this.emit("todo:priority", {
      id: li.dataset.id,
      text: textSpan.textContent,
      priority: !isPriority
    });
  }

  toggleOnHold(li) {
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;

    // Check if already on hold
    const isOnHold = li.classList.contains("on-hold");
    
    if (isOnHold) {
      // Remove on hold
      li.classList.remove("on-hold");
      const onHoldSpan = li.querySelector(".todo-onhold");
      if (onHoldSpan) {
        onHoldSpan.remove();
      }
    } else {
      // Add on hold
      li.classList.add("on-hold");
      
      // Create hidden on hold span (like other metadata)
      let onHoldSpan = li.querySelector(".todo-onhold");
      if (!onHoldSpan) {
        onHoldSpan = document.createElement("span");
        onHoldSpan.className = "todo-onhold";
        onHoldSpan.style.display = "none"; // Hide the span, show in button
        // Insert after buttons container if it exists, otherwise after text
        const buttonsContainer = li.querySelector(".todo-hover-buttons");
        if (buttonsContainer) {
          buttonsContainer.after(onHoldSpan);
        } else {
          textSpan.after(onHoldSpan);
        }
      }
      onHoldSpan.textContent = " on hold";
    }

    // Update the hover button to show the data
    this.updateHoverButtons(li);

    // Restore focus to the todo item
    li.focus();

    this.emit("todo:onhold", {
      id: li.dataset.id,
      text: textSpan.textContent,
      onHold: !isOnHold
    });
  }

  emit(name,detail){ this.el.dispatchEvent(new CustomEvent(name,{detail})); }
}

window.TodoList=TodoList;
