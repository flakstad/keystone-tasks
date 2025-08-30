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
  }

  bindEvents() {


    this.el.addEventListener("click", e => {
      const li = e.target.closest("li");
      if (!li) return;

      if (e.target.classList.contains("todo-label")) {
        console.log("Label clicked", li.dataset.id);
        this.toggleItem(li);  // or custom behavior for label click
      } else if (e.target.classList.contains("todo-text")) {
        console.log("Text clicked", li.dataset.id);
        // Enter edit mode when clicking on text
        this.enterEditMode(li);
      }
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
        this.tagItem(li);
        return;
      }

      // Set schedule with 's' key
      if(e.key==="s" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.scheduleItem(li);
        return;
      }

      // Assign with 'a' key
      if(e.key==="a" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.assignItem(li);
        return;
      }

      // Navigate to solo view with Enter
      if(e.key==="Enter" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
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
        this.saveEdit(li, input.value);
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
  }

  scheduleItem(li) {
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;

    // Get or create schedule indicator
    let scheduleSpan = li.querySelector(".todo-schedule");
    if (!scheduleSpan) {
      scheduleSpan = document.createElement("span");
      scheduleSpan.className = "todo-schedule";
      textSpan.after(scheduleSpan);
    }

    // Add current timestamp (for demo - in real implementation this would be user input)
    const now = new Date();
    const timestamp = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    scheduleSpan.textContent = ` ${timestamp}`;

    this.emit("todo:schedule", {
      id: li.dataset.id,
      text: textSpan.textContent,
      timestamp: now.toISOString()
    });
  }

  assignItem(li) {
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;

    // Get or create assign indicator
    let assignSpan = li.querySelector(".todo-assign");
    if (!assignSpan) {
      assignSpan = document.createElement("span");
      assignSpan.className = "todo-assign";
      textSpan.after(assignSpan);
    }

    // For demo purposes, cycle through some example assignees
    const assignees = ["alice", "bob", "charlie", "diana"];
    const currentAssignee = assignSpan.textContent.trim();
    const currentIndex = assignees.indexOf(currentAssignee);
    const nextIndex = (currentIndex + 1) % assignees.length;
    const nextAssignee = assignees[nextIndex];
    
    assignSpan.textContent = ` ${nextAssignee}`;

    this.emit("todo:assign", {
      id: li.dataset.id,
      text: textSpan.textContent,
      assignee: nextAssignee
    });
  }

  tagItem(li) {
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;

    // Get or create tags indicator
    let tagsSpan = li.querySelector(".todo-tags");
    if (!tagsSpan) {
      tagsSpan = document.createElement("span");
      tagsSpan.className = "todo-tags";
      textSpan.after(tagsSpan);
    }

    // For demo purposes, cycle through some example tag combinations
    const tagSets = [
      ["urgent"],
      ["urgent", "bug"],
      ["feature"],
      ["feature", "ui"],
      ["docs"],
      []  // no tags
    ];
    
    const currentTags = tagsSpan.textContent.trim();
    const currentIndex = tagSets.findIndex(tags => 
      tags.length === 0 ? currentTags === "" : currentTags === ` ${tags.join(" ")}`
    );
    const nextIndex = (currentIndex + 1) % tagSets.length;
    const nextTags = tagSets[nextIndex];
    
    tagsSpan.textContent = nextTags.length > 0 ? ` ${nextTags.join(" ")}` : "";

    this.emit("todo:tags", {
      id: li.dataset.id,
      text: textSpan.textContent,
      tags: nextTags
    });
  }

  addHoverButtons(li) {
    // Don't add buttons if they already exist
    if (li.querySelector(".todo-hover-buttons")) return;

    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "todo-hover-buttons";

    // Schedule button
    const scheduleBtn = document.createElement("button");
    scheduleBtn.className = "hover-button";
    scheduleBtn.textContent = "S";
    scheduleBtn.title = "Schedule";
    scheduleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showSchedulePopup(li, scheduleBtn);
    });

    // Assign button
    const assignBtn = document.createElement("button");
    assignBtn.className = "hover-button";
    assignBtn.textContent = "A";
    assignBtn.title = "Assign";
    assignBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showAssignPopup(li, assignBtn);
    });

    // Tags button
    const tagsBtn = document.createElement("button");
    tagsBtn.className = "hover-button";
    tagsBtn.textContent = "T";
    tagsBtn.title = "Tags";
    tagsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showTagsPopup(li, tagsBtn);
    });

    buttonsContainer.appendChild(scheduleBtn);
    buttonsContainer.appendChild(assignBtn);
    buttonsContainer.appendChild(tagsBtn);
    
    li.appendChild(buttonsContainer);
  }

  closeAllPopups() {
    document.querySelectorAll('.todo-popup').forEach(popup => popup.remove());
  }

  positionPopup(popup, button) {
    // Append to the todo list container, not document.body
    this.el.style.position = 'relative'; // Ensure container is positioned
    this.el.appendChild(popup);
    
    // Get button position relative to the list container
    const containerRect = this.el.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    
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
        this.closeAllPopups();
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
          this.closeAllPopups();
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
      textSpan.after(scheduleSpan);
    }

    const timestamp = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    scheduleSpan.textContent = ` ${timestamp}`;

    this.emit("todo:schedule", {
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
        this.closeAllPopups();
      }
    });
    
    // Position popup relative to the list container
    this.positionPopup(popup, button);
    
    input.focus();
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!popup.contains(e.target)) {
          this.closeAllPopups();
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
      textSpan.after(assignSpan);
    }

    assignSpan.textContent = ` ${assignee}`;

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
        this.closeAllPopups();
      }
    });
    
    // Position popup relative to the list container
    this.positionPopup(popup, button);
    
    input.focus();
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!popup.contains(e.target)) {
          this.closeAllPopups();
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
      textSpan.after(tagsSpan);
    }

    tagsSpan.textContent = tags.length > 0 ? ` ${tags.join(' ')}` : "";

    this.emit("todo:tags", {
      id: li.dataset.id,
      text: textSpan.textContent,
      tags: tags
    });
  }

  emit(name,detail){ this.el.dispatchEvent(new CustomEvent(name,{detail})); }
}

window.TodoList=TodoList;
