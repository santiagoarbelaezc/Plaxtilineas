import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faClock,
  faUsers,
  faLightbulb,
  faHandshake,
  faGraduationCap
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-values',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './values.component.html',
  styleUrls: ['./values.component.css']
})
export class Values {
  constructor(library: FaIconLibrary) {
    library.addIcons(faClock, faUsers, faLightbulb, faHandshake, faGraduationCap);
  }
}
