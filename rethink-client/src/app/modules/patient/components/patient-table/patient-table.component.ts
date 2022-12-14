import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Store } from '@ngrx/store';
import { fromEvent, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { PatientFilter } from 'src/app/modules/core/api/api.routes';
import { IPatient } from '../../models/patient.model';
import { DataSourceFn, PatientsDataSource } from '../../patient.data-source';
import { PatientState } from '../../state/patient.reducer';



@Component({
  selector: 'app-patient-table',
  templateUrl: './patient-table.component.html',
  styleUrls: ['./patient-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientTableComponent implements OnInit {

  @Input() patients: IPatient[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('lastNameSearch') lastNameFilter!: ElementRef;
  @ViewChild('genderSearch') genderFilter!: ElementRef;


  dataSource!: PatientsDataSource;
  displayedColumns: string[] = ['id', 'firstname', 'lastname', 'birthday', 'gender', 'actions'];
  pageSizeOptions: number[] = [1, 3, 5];
  pageSize: number = 1;
  private _filter: PatientFilter = {}

  constructor(private _store: Store<PatientState>, private _fb: FormBuilder, private _formBuilder: FormBuilder) {

  }

  ngOnInit(): void {

    this.dataSource = new PatientsDataSource(this._store, this._fb, this._formBuilder);
    this.dataSource.loadData({ skip: 0, take: this.pageSizeOptions[0], sortDirection: this.sort?.direction ?? 'desc' })

  }

  ngAfterViewInit() {

    this.subToFilters();

    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => this.pagePatients())
      ).subscribe()
  }

  /**
   * subscribe to search filters, add new ones here
   */
  subToFilters() {
    merge(
      fromEvent(this.lastNameFilter.nativeElement, 'keyup'),
      fromEvent(this.genderFilter.nativeElement, 'keyup')
    )
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        tap((el) => {
          this._filter.lastName = this.lastNameFilter.nativeElement.value;
          this._filter.gender = this.genderFilter.nativeElement.value;
          this.paginator.pageIndex = 0;
          this.pagePatients();
        })
      ).subscribe();
  }

  /**
   * paging functionality is decoupled from table data source and implemented by using component 
   */
  pagePatients() {
    this.dataSource.loadData(
      {
        ...this._filter,
        skip: this.paginator.pageIndex * this.paginator.pageSize,
        take: this.paginator.pageSize,
        sortDirection: this.sort.direction
      }
    )
  }

  // this function will enabled the select field for editd
  allowEdit(forms: FormGroup, i: number) {
    (forms.get('editRows') as FormArray)?.at(i)?.get('isEditable')?.patchValue(true);
    // this.isEditableNew = true;

  }


  // On click of correct button in table (after click on edit) this method will call
  saveEdit(forms: FormGroup, i: number) {
    var patient = {} as any;

    var rowForm = ((forms.get('editRows') as FormArray)?.at(i) as FormGroup);

    Object.keys(rowForm.controls).forEach(key => {
      patient[key] = rowForm.get(key)?.value;
    });

    this.dataSource.updatePatient(patient);

    (forms.get('editRows') as FormArray)?.at(i)?.get('isEditable')?.patchValue(false);
  }

  // deletePatient(forms: FormGroup, i: number) {

  // }
  deletePatient: DataSourceFn = (forms: FormGroup, i: number) => {
    var id = (forms.get('editRows') as FormArray)?.at(i)?.get('id')?.value
    this.dataSource.deletePatient(id, (forms.get('editRows') as FormArray)?.at(i));

  }
  // On click of cancel button in the table (after click on edit) this method will call and reset the previous data
  cancelEdit: DataSourceFn = (forms: FormGroup, i: number) => {
    (forms.get('editRows') as FormArray)?.at(i)?.get('isEditable')?.reset();
  }

}
